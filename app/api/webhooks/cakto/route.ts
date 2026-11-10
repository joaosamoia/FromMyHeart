// app/api/webhooks/cakto/route.ts
//
// Recebe a confirmação de pagamento da Cakto e libera a página no Firestore.
// Mesmo papel do webhook da Kiwify (/api/webhooks/kiwify), que continua no ar
// durante a migração.
//
// Formato (docs.cakto.com.br/conceitos/webhooks):
//   POST { secret, event, data }
//   headers X-Cakto-Timestamp e X-Cakto-Signature: "v1=<hmac-sha256>"
//   de `${timestamp}.${corpo cru}`, com o secret do webhook como chave.
// No webhook V2 (criado pelo painel), `data` vem como lista: tratamos os dois.
//
// De onde vem cada informação:
//   • slug da página → `sck` (montarCheckout coloca o slug lá); utm_content e
//     callback ficam de reserva.
//   • adicionais → nome da oferta/produto: "QR" libera o cartão com QR Code,
//     "Mapa Estelar"/"Astral" libera o mapa. Vale tanto pra oferta por
//     combinação (como era na Kiwify) quanto pra order bump.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPageReadyEmail } from "@/lib/email";
import { contarEvento } from "@/lib/funil-server";

const TOLERANCIA_S = 5 * 60;

function igual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Assinatura no header (preferida) ou, se ela não vier, o `secret` do corpo.
function origemValida(raw: string, req: NextRequest, secret: string): boolean {
  const ts = req.headers.get("x-cakto-timestamp");
  const sig = req.headers.get("x-cakto-signature");
  if (ts && sig) {
    if (!/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > TOLERANCIA_S) return false;
    const esperado = "v1=" + crypto.createHmac("sha256", secret).update(`${ts}.`).update(raw).digest("hex");
    // o header pode trazer várias versões separadas por vírgula (ex.: "v1=…,v2=…")
    return sig.split(",").some((s) => igual(s.trim(), esperado));
  }
  try {
    const corpo = JSON.parse(raw);
    return typeof corpo?.secret === "string" && igual(corpo.secret, secret);
  } catch {
    return false;
  }
}

const SLUG_OK = /^[a-z0-9][a-z0-9-]{0,80}$/i;

function slugDoPedido(d: any): string | null {
  for (const c of [d?.sck, d?.utm_content, d?.callback]) {
    const v = typeof c === "string" ? c.trim() : "";
    if (v && SLUG_OK.test(v)) return v;
  }
  return null;
}

// Retrospectiva: "Essencial" ou "Completa" no nome. A Completa já vem com QR.
function adicionais(d: any) {
  const nomes = `${d?.offer?.name ?? ""} | ${d?.product?.name ?? ""}`;
  const plano = /essencial/i.test(nomes) ? "essencial" : /completa/i.test(nomes) ? "completa" : null;
  return {
    qr: /\bqr\b|qr\s*code|qrcode/i.test(nomes) || plano === "completa",
    astral: /mapa\s*estelar|astral/i.test(nomes),
    plano,
  };
}

type Resultado = { slug?: string; acao: string };

async function processarPedido(d: any, siteUrl: string): Promise<Resultado> {
  if (d?.status !== "paid") return { acao: `ignorado (status ${d?.status ?? "?"})` };

  const slug = slugDoPedido(d);
  if (!slug) {
    console.error("Cakto webhook: pedido pago sem slug (sck/utm_content).", { refId: d?.refId, offer: d?.offer?.id });
    return { acao: "sem slug" };
  }

  const ref = getAdminDb().collection("pages").doc(slug);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`Cakto webhook: pedido ${d?.refId} aponta pra "${slug}", que não existe.`);
    return { slug, acao: "página inexistente" };
  }
  const atual = snap.data() ?? {};
  const { qr, astral, plano } = adicionais(d);
  const tipo: string = d?.offer_type ?? "main";

  // Order bump/upsell pago à parte: só soma o adicional, sem mexer no resto.
  if (tipo !== "main") {
    const extra: Record<string, boolean> = {};
    if (qr) extra.qrPaid = true;
    if (astral) extra.astral = true;
    if (Object.keys(extra).length) await ref.set(extra, { merge: true });
    console.log(`Cakto webhook: ${tipo} de "${slug}" →`, extra);
    return { slug, acao: `adicional (${tipo})` };
  }

  const jaPago = atual.status === "pago";
  const email: string | undefined = d?.customer?.email || undefined;
  await ref.set(
    {
      status: "pago",
      paidAt: atual.paidAt || Date.now(),
      gateway: "cakto",
      caktoPedido: d?.refId ?? d?.id ?? null,
      // um bump que chegou antes do pedido principal não é desfeito aqui
      astral: astral || atual.astral === true,
      qrPaid: qr || atual.qrPaid === true,
      // o plano vem do que foi pago, não do que o formulário salvou
      ...(atual.style === "retro" ? { retroPlano: plano ?? "completa" } : {}),
      ...(email ? { buyerEmail: email } : {}),
    },
    { merge: true }
  );

  // A Cakto reenvia em caso de timeout: venda e e-mail só na primeira vez.
  if (jaPago) return { slug, acao: "já estava pago" };

  const produto = atual.style === "retro" ? "retro" : atual.style === "date" ? "date" : "classica";
  await contarEvento(produto, "pago").catch((e) => console.error("[funil] não contou a venda:", e));

  const para = email || atual.buyerEmail;
  if (para) {
    await sendPageReadyEmail({
      to: para,
      buyerName: atual.buyerName || d?.customer?.name || "",
      pageTitle: atual.title || "",
      pageUrl: `${siteUrl}/${slug}`,
      produto,
      cardUrl: produto === "retro" && (qr || atual.qrPaid === true) ? `${siteUrl}/${slug}/cartao` : undefined,
    }).catch((e) => console.error("Cakto webhook: falha no e-mail:", e));
  } else {
    console.warn(`Cakto webhook: sem e-mail pra "${slug}", confirmação não enviada.`);
  }
  console.log(`Cakto webhook: "${slug}" liberada${plano ? ` (${plano})` : ""}${qr ? " (+ QR)" : ""}${astral ? " (+ Mapa Estelar)" : ""}.`);
  return { slug, acao: "liberado" };
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  const secret = process.env.CAKTO_WEBHOOK_SECRET;
  if (!secret) {
    // Sem o secret qualquer um poderia liberar página de graça: recusamos.
    console.error("CAKTO_WEBHOOK_SECRET não configurada: webhook da Cakto recusado.");
    return NextResponse.json({ error: "webhook não configurado" }, { status: 503 });
  }
  if (!origemValida(raw, req, secret)) {
    console.warn("Cakto webhook: assinatura/secret inválido, requisição rejeitada.");
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  let corpo: any;
  try {
    corpo = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const evento: string = corpo?.event ?? "";
  if (evento !== "purchase_approved") {
    return NextResponse.json({ ok: true, ignorado: evento || "sem evento" });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/+$/, "");
  const pedidos: any[] = Array.isArray(corpo.data) ? corpo.data : [corpo.data];
  // principal primeiro: assim o bump do mesmo envio (V2) cai numa página já paga
  pedidos.sort((a, b) => Number(b?.offer_type === "main") - Number(a?.offer_type === "main"));

  const resultados: Resultado[] = [];
  for (const d of pedidos) {
    try {
      resultados.push(await processarPedido(d, siteUrl));
    } catch (e) {
      // A Cakto não reenvia quando respondemos erro; o histórico do webhook
      // no painel permite reenviar à mão depois de corrigir.
      console.error("Cakto webhook: erro ao processar pedido", d?.refId, e);
      return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, resultados });
}

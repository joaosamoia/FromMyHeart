// app/api/webhooks/kiwify/route.ts
//
export const dynamic = "force-dynamic";
//
// Recebe a confirmação de pagamento da Kiwify e libera a página no Firestore.
//
// ⚠️ IMPORTANTE — leia antes de colocar em produção:
// O formato exato do payload do webhook "clássico" de compra (o que dispara em
// "Pedido aprovado" no painel Apps > Webhooks) pode variar um pouco por conta
// da versão da API. A forma confiável de descobrir os campos certos é:
//   1. Criar o webhook no painel da Kiwify apontando pra
//      https://SEU-DOMINIO.com/api/webhooks/kiwify
//   2. Clicar em "Testar Webhook" (ou fazer uma compra de teste)
//   3. Abrir "Ver logs" do webhook e copiar o JSON recebido
//   4. Ajustar a função extractOrderInfo() abaixo pra bater com os nomes reais
//      dos campos que você vir no log (ex: order_status, Product, Customer, etc.)
//
// O código abaixo já cobre os formatos mais comuns encontrados em integrações
// Kiwify, mas trate-o como ponto de partida, não como certeza absoluta.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPageReadyEmail } from "@/lib/email";

// Verificação do webhook. A Kiwify chama esse campo simplesmente de "Token"
// (não especifica se é uma chave de HMAC ou um valor comparado diretamente),
// então aceitamos as DUAS possibilidades — o que vier certo, valida:
//   (a) HMAC-SHA256 do corpo inteiro, usando o token como chave (padrão
//       usado por Stripe/GitHub/etc quando o campo se chama "secret")
//   (b) o próprio token enviado em texto puro (header, query param ou no
//       corpo), comparado diretamente — padrão mais simples, comum quando
//       o campo se chama só "Token"
// Depois de clicar em "Testar Webhook" na Kiwify, vale olhar "Ver logs" pra
// confirmar qual dos dois formatos está realmente chegando.
function verifyWebhook(rawBody: string, req: NextRequest, url: URL, secret: string): boolean {
  const headerSig = req.headers.get("x-kiwify-signature");
  const querySig = url.searchParams.get("signature");
  const queryToken = url.searchParams.get("token");
  const headerToken = req.headers.get("x-kiwify-token");

  // (a) HMAC — a Kiwify usa SHA-1 (assinatura de 40 caracteres hex), mas
  // deixamos SHA-256 como fallback caso isso mude no futuro.
  const expectedSha1 = crypto.createHmac("sha1", secret).update(rawBody).digest("hex");
  const expectedSha256 = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  for (const candidate of [headerSig, querySig]) {
    if (!candidate) continue;
    if (safeEqual(candidate, expectedSha1)) return true;
    if (safeEqual(candidate, expectedSha256)) return true;
  }

  // (b) token em texto puro
  for (const candidate of [queryToken, headerToken]) {
    if (candidate && safeEqual(candidate, secret)) return true;
  }

  // (b-alternativo) token dentro do próprio corpo JSON
  try {
    const parsed = JSON.parse(rawBody);
    const bodyToken = parsed?.token ?? parsed?.Token ?? parsed?.webhook_token;
    if (bodyToken && safeEqual(String(bodyToken), secret)) return true;
  } catch {}

  return false;
}

function safeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false; // tamanhos diferentes = não bate mesmo
  }
}

// Extrai { slug, isApproved } do payload. Ajuste aqui conforme o payload real
// que você observar nos logs (ver aviso no topo do arquivo).
function extractOrderInfo(body: any, slugFromQuery: string | null) {
  const status: string =
    body?.order_status ?? body?.data?.order_status ?? body?.status ?? body?.data?.status ?? "";

  const isApproved = ["paid", "approved", "aprovado", "compra aprovada"].includes(
    String(status).toLowerCase()
  );

  const slug: string | null =
    body?.TrackingParameters?.s ??
    body?.tracking_parameters?.s ??
    body?.data?.tracking_parameters?.s ??
    slugFromQuery;

  const buyerEmail: string | undefined = body?.Customer?.email ?? body?.data?.customer?.email;

  // Vendemos combinações de produtos (plano × addons) em vez de usar order
  // bump nativo — isso evita o descompasso de "marcou no quiz mas desmarcou
  // no checkout da Kiwify". Cada addon (Mapa Estelar, QR Personalizado) tem
  // sua PRÓPRIA lista de IDs de produto que o incluem — assim, adicionar um
  // novo addon no futuro é só criar mais uma lista, sem mexer nesta lógica.
  const productId: string | undefined =
    body?.Product?.product_id ?? body?.product_id ?? body?.data?.product?.id;

  const parseIdList = (raw?: string) =>
    new Set((raw ?? "").split(",").map((s) => s.trim()).filter(Boolean));

  const astralIds = parseIdList(process.env.KIWIFY_PRODUCT_IDS_ASTRAL);
  const qrIds = parseIdList(process.env.KIWIFY_PRODUCT_IDS_QR);

  const hasAstralBump = !!productId && astralIds.has(productId);
  const hasQrBump = !!productId && qrIds.has(productId);

  return { isApproved, slug, buyerEmail, rawStatus: status, hasAstralBump, hasQrBump };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const url = new URL(req.url);
  const slugFromQuery = url.searchParams.get("s");

  const secret = process.env.KIWIFY_WEBHOOK_SECRET;

  if (secret) {
    const valid = verifyWebhook(rawBody, req, url, secret);
    if (!valid) {
      console.warn("Kiwify webhook: token/assinatura inválida, requisição rejeitada.");
      return NextResponse.json({ error: "token inválido" }, { status: 401 });
    }
  } else {
    console.warn(
      "KIWIFY_WEBHOOK_SECRET não configurada — aceitando webhook SEM verificar token. " +
        "Configure o secret antes de ir pra produção."
    );
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { isApproved, slug, buyerEmail, rawStatus, hasAstralBump, hasQrBump } = extractOrderInfo(
    body,
    slugFromQuery
  );

  if (!slug) {
    console.error("Kiwify webhook: não foi possível identificar o slug da página.", body);
    return NextResponse.json({ error: "slug não encontrado no payload" }, { status: 400 });
  }

  if (!isApproved) {
    // Pagamento recusado, estornado, pendente etc. — não libera a página.
    console.log(`Kiwify webhook: pedido de "${slug}" com status "${rawStatus}", não aprovado.`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const docRef = getAdminDb().collection("pages").doc(slug);
  const existing = await docRef.get();
  const existingData = existing.data();

  await docRef.set(
    {
      status: "pago",
      paidAt: Date.now(),
      astral: hasAstralBump, // só libera o Mapa Estelar se o webhook confirmou a compra do addon
      qrPaid: hasQrBump, // idem pro QR Code Personalizado
      // O e-mail do payload da Kiwify é o mais confiável pra correspondência
      // com o comprador de verdade; usamos o que já estava no rascunho do
      // quiz como fallback, caso o payload não traga esse campo.
      ...(buyerEmail ? { buyerEmail } : {}),
    },
    { merge: true }
  );

  console.log(
    `Kiwify webhook: página "${slug}" liberada com sucesso.` +
      `${hasAstralBump ? " (+ Mapa Estelar)" : ""}${hasQrBump ? " (+ QR Personalizado)" : ""}`
  );

  // Dispara o e-mail com o link da página — é a forma confiável de entrega,
  // independente do que acontecer na sessão do navegador do cliente.
  const finalEmail = buyerEmail || existingData?.buyerEmail;
  if (finalEmail) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    await sendPageReadyEmail({
      to: finalEmail,
      buyerName: existingData?.buyerName || "amor",
      pageTitle: existingData?.title || "Sua página",
      pageUrl: `${siteUrl}/${slug}`,
    });
  } else {
    console.warn(`Kiwify webhook: sem e-mail disponível pra "${slug}" — confirmação não enviada.`);
  }

  return NextResponse.json({ ok: true });
}// app/api/webhooks/kiwify/route.ts
//
export const dynamic = "force-dynamic";
//
// Recebe a confirmação de pagamento da Kiwify e libera a página no Firestore.
//
// ⚠️ IMPORTANTE — leia antes de colocar em produção:
// O formato exato do payload do webhook "clássico" de compra (o que dispara em
// "Pedido aprovado" no painel Apps > Webhooks) pode variar um pouco por conta
// da versão da API. A forma confiável de descobrir os campos certos é:
//   1. Criar o webhook no painel da Kiwify apontando pra
//      https://SEU-DOMINIO.com/api/webhooks/kiwify
//   2. Clicar em "Testar Webhook" (ou fazer uma compra de teste)
//   3. Abrir "Ver logs" do webhook e copiar o JSON recebido
//   4. Ajustar a função extractOrderInfo() abaixo pra bater com os nomes reais
//      dos campos que você vir no log (ex: order_status, Product, Customer, etc.)
//
// O código abaixo já cobre os formatos mais comuns encontrados em integrações
// Kiwify, mas trate-o como ponto de partida, não como certeza absoluta.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPageReadyEmail } from "@/lib/email";

// Verificação do webhook. A Kiwify chama esse campo simplesmente de "Token"
// (não especifica se é uma chave de HMAC ou um valor comparado diretamente),
// então aceitamos as DUAS possibilidades — o que vier certo, valida:
//   (a) HMAC-SHA256 do corpo inteiro, usando o token como chave (padrão
//       usado por Stripe/GitHub/etc quando o campo se chama "secret")
//   (b) o próprio token enviado em texto puro (header, query param ou no
//       corpo), comparado diretamente — padrão mais simples, comum quando
//       o campo se chama só "Token"
// Depois de clicar em "Testar Webhook" na Kiwify, vale olhar "Ver logs" pra
// confirmar qual dos dois formatos está realmente chegando.
function verifyWebhook(rawBody: string, req: NextRequest, url: URL, secret: string): boolean {
  const headerSig = req.headers.get("x-kiwify-signature");
  const querySig = url.searchParams.get("signature");
  const queryToken = url.searchParams.get("token");
  const headerToken = req.headers.get("x-kiwify-token");

  // (a) HMAC-SHA256
  const expectedHmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  for (const candidate of [headerSig, querySig]) {
    if (candidate && safeEqual(candidate, expectedHmac)) return true;
  }

  // (b) token em texto puro
  for (const candidate of [queryToken, headerToken]) {
    if (candidate && safeEqual(candidate, secret)) return true;
  }

  // (b-alternativo) token dentro do próprio corpo JSON
  try {
    const parsed = JSON.parse(rawBody);
    const bodyToken = parsed?.token ?? parsed?.Token ?? parsed?.webhook_token;
    if (bodyToken && safeEqual(String(bodyToken), secret)) return true;
  } catch {}

  return false;
}

function safeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false; // tamanhos diferentes = não bate mesmo
  }
}

// Extrai { slug, isApproved } do payload. Ajuste aqui conforme o payload real
// que você observar nos logs (ver aviso no topo do arquivo).
function extractOrderInfo(body: any, slugFromQuery: string | null) {
  const status: string =
    body?.order_status ?? body?.data?.order_status ?? body?.status ?? body?.data?.status ?? "";

  const isApproved = ["paid", "approved", "aprovado", "compra aprovada"].includes(
    String(status).toLowerCase()
  );

  const slug: string | null =
    body?.TrackingParameters?.s ??
    body?.tracking_parameters?.s ??
    body?.data?.tracking_parameters?.s ??
    slugFromQuery;

  const buyerEmail: string | undefined = body?.Customer?.email ?? body?.data?.customer?.email;

  // Vendemos combinações de produtos (plano × addons) em vez de usar order
  // bump nativo — isso evita o descompasso de "marcou no quiz mas desmarcou
  // no checkout da Kiwify". Cada addon (Mapa Estelar, QR Personalizado) tem
  // sua PRÓPRIA lista de IDs de produto que o incluem — assim, adicionar um
  // novo addon no futuro é só criar mais uma lista, sem mexer nesta lógica.
  const productId: string | undefined =
    body?.Product?.product_id ?? body?.product_id ?? body?.data?.product?.id;

  const parseIdList = (raw?: string) =>
    new Set((raw ?? "").split(",").map((s) => s.trim()).filter(Boolean));

  const astralIds = parseIdList(process.env.KIWIFY_PRODUCT_IDS_ASTRAL);
  const qrIds = parseIdList(process.env.KIWIFY_PRODUCT_IDS_QR);

  const hasAstralBump = !!productId && astralIds.has(productId);
  const hasQrBump = !!productId && qrIds.has(productId);

  return { isApproved, slug, buyerEmail, rawStatus: status, hasAstralBump, hasQrBump };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const url = new URL(req.url);
  const slugFromQuery = url.searchParams.get("s");

  const secret = process.env.KIWIFY_WEBHOOK_SECRET;

  // 🔍 LOG DE DIAGNÓSTICO TEMPORÁRIO — remova depois de confirmar o formato certo.
  // Mostra tudo que chegou, pra descobrir onde a Kiwify realmente coloca o token.
  console.log("=== DIAGNÓSTICO WEBHOOK KIWIFY ===");
  console.log("URL completa:", req.url);
  console.log("Query params:", Object.fromEntries(url.searchParams.entries()));
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  console.log("Body (primeiros 500 caracteres):", rawBody.slice(0, 500));
  console.log("Secret configurado (Vercel):", secret ? `"${secret}" (${secret.length} caracteres)` : "NÃO CONFIGURADO");
  console.log("===================================");

  if (secret) {
    const valid = verifyWebhook(rawBody, req, url, secret);
    if (!valid) {
      console.warn("Kiwify webhook: token/assinatura inválida, requisição rejeitada.");
      return NextResponse.json({ error: "token inválido" }, { status: 401 });
    }
  } else {
    console.warn(
      "KIWIFY_WEBHOOK_SECRET não configurada — aceitando webhook SEM verificar token. " +
        "Configure o secret antes de ir pra produção."
    );
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { isApproved, slug, buyerEmail, rawStatus, hasAstralBump, hasQrBump } = extractOrderInfo(
    body,
    slugFromQuery
  );

  if (!slug) {
    console.error("Kiwify webhook: não foi possível identificar o slug da página.", body);
    return NextResponse.json({ error: "slug não encontrado no payload" }, { status: 400 });
  }

  if (!isApproved) {
    // Pagamento recusado, estornado, pendente etc. — não libera a página.
    console.log(`Kiwify webhook: pedido de "${slug}" com status "${rawStatus}", não aprovado.`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const docRef = getAdminDb().collection("pages").doc(slug);
  const existing = await docRef.get();
  const existingData = existing.data();

  await docRef.set(
    {
      status: "pago",
      paidAt: Date.now(),
      astral: hasAstralBump, // só libera o Mapa Estelar se o webhook confirmou a compra do addon
      qrPaid: hasQrBump, // idem pro QR Code Personalizado
      // O e-mail do payload da Kiwify é o mais confiável pra correspondência
      // com o comprador de verdade; usamos o que já estava no rascunho do
      // quiz como fallback, caso o payload não traga esse campo.
      ...(buyerEmail ? { buyerEmail } : {}),
    },
    { merge: true }
  );

  console.log(
    `Kiwify webhook: página "${slug}" liberada com sucesso.` +
      `${hasAstralBump ? " (+ Mapa Estelar)" : ""}${hasQrBump ? " (+ QR Personalizado)" : ""}`
  );

  // Dispara o e-mail com o link da página — é a forma confiável de entrega,
  // independente do que acontecer na sessão do navegador do cliente.
  const finalEmail = buyerEmail || existingData?.buyerEmail;
  if (finalEmail) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    await sendPageReadyEmail({
      to: finalEmail,
      buyerName: existingData?.buyerName || "amor",
      pageTitle: existingData?.title || "Sua página",
      pageUrl: `${siteUrl}/${slug}`,
    });
  } else {
    console.warn(`Kiwify webhook: sem e-mail disponível pra "${slug}" — confirmação não enviada.`);
  }

  return NextResponse.json({ ok: true });
}

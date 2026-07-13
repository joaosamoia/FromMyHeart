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

// Verificação de assinatura por HMAC-SHA256 (padrão usado por Kiwify, Stripe, GitHub etc).
// A Kiwify pode enviar a assinatura num header (ex: "x-kiwify-signature") OU
// como query param "?signature=" na URL configurada no painel — suportamos os dois.
function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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
  const signature =
    req.headers.get("x-kiwify-signature") ?? url.searchParams.get("signature");

  const secret = process.env.KIWIFY_WEBHOOK_SECRET;
  if (secret) {
    const valid = verifySignature(rawBody, signature, secret);
    if (!valid) {
      console.warn("Kiwify webhook: assinatura inválida, requisição rejeitada.");
      return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
    }
  } else {
    console.warn(
      "KIWIFY_WEBHOOK_SECRET não configurada — aceitando webhook SEM verificar assinatura. " +
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

  await getAdminDb().collection("pages").doc(slug).set(
    {
      status: "pago",
      paidAt: Date.now(),
      astral: hasAstralBump, // só libera o Mapa Estelar se o webhook confirmou a compra do addon
      qrPaid: hasQrBump, // idem pro QR Code Personalizado
      ...(buyerEmail ? { buyerEmail } : {}),
    },
    { merge: true }
  );

  console.log(
    `Kiwify webhook: página "${slug}" liberada com sucesso.` +
      `${hasAstralBump ? " (+ Mapa Estelar)" : ""}${hasQrBump ? " (+ QR Personalizado)" : ""}`
  );
  return NextResponse.json({ ok: true });
}

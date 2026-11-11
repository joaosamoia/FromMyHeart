// lib/checkout.ts
// Links de checkout, compartilhados entre o quiz (/criar) e a prévia (/previa),
// que precisa mandar a pessoa direto pro pagamento certo.
//
// A operação está migrando da Kiwify pra Cakto. Cada chave usa o link da Cakto
// quando ele estiver preenchido em CAKTO_CHECKOUT; enquanto estiver vazio,
// continua indo pra Kiwify. Assim dá pra trocar produto por produto, sem
// derrubar nenhuma venda no meio da migração.

// ⚠️ Troque pelos links reais dos seus produtos na Kiwify.
export const KIWIFY_CHECKOUT: Record<string, string> = {
  "1dia": "https://pay.kiwify.com.br/CY7GbkU",
  "1dia-astral": "https://pay.kiwify.com.br/a9ZQfh5",
  "1dia-qr": "https://pay.kiwify.com.br/zzKOQJ2",
  "1dia-astral-qr": "https://pay.kiwify.com.br/nnHxMtk",
  eterno: "https://pay.kiwify.com.br/b0clBFL",
  "eterno-astral": "https://pay.kiwify.com.br/K9ItEIY",
  "eterno-qr": "https://pay.kiwify.com.br/ooq0qgi",
  "eterno-astral-qr": "https://pay.kiwify.com.br/Fv11z3Z",
  date: "https://pay.kiwify.com.br/1tedzUy",
  // O webhook libera pelo slug que vai no ?s1=.
  retro: "https://pay.kiwify.com.br/S0E3Ee8",
  // Retrospectiva + QR Code personalizado (cartão pra imprimir e entregar em mãos).
  // Produto à parte na Kiwify. O webhook reconhece pelo nome do
  // produto ("… QR Code …"), sem precisar mexer em KIWIFY_PRODUCT_IDS_QR.
  "retro-qr": "https://pay.kiwify.com.br/pds9P8g",
};

// Retrospectiva: "retro" = Completa (já com QR); Essencial com ou sem QR.


// Links da Cakto: https://pay.cakto.com.br/{id da oferta}. Uma oferta por
// combinação, igual era na Kiwify. Deixe "" pra continuar usando a Kiwify.
// O webhook (/api/webhooks/cakto) reconhece os adicionais pelo NOME da oferta:
// "QR" libera o cartão com QR Code e "Mapa Estelar" libera o mapa.
export const CAKTO_CHECKOUT: Record<string, string> = {
  "1dia": "https://pay.cakto.com.br/vjxhrt8",
  "1dia-astral": "https://pay.cakto.com.br/o3i4nnd",
  "1dia-qr": "https://pay.cakto.com.br/v7p74k2",
  "1dia-astral-qr": "https://pay.cakto.com.br/62xecsj",
  eterno: "https://pay.cakto.com.br/364sika",
  "eterno-astral": "https://pay.cakto.com.br/ebsiqx6",
  "eterno-qr": "https://pay.cakto.com.br/gtzaf4o",
  "eterno-astral-qr": "https://pay.cakto.com.br/36z8xop",
  date: "https://pay.cakto.com.br/8tc8c6k",
  // Retrospectiva Completa (R$ 29,99, já com QR Code)
  retro: "https://pay.cakto.com.br/asoi4o5",
  // links antigos de "Retrospectiva + QR" caem na Completa, que já tem QR
  "retro-qr": "https://pay.cakto.com.br/asoi4o5",
  // Retrospectiva Essencial (R$ 19,99) e Essencial + QR Code (R$ 24,98)
  "retro-essencial": "https://pay.cakto.com.br/ciyyqj8_1306292",
  "retro-essencial-qr": "https://pay.cakto.com.br/uk7juim",
};

// Link de checkout de cada combinação: Cakto quando houver, Kiwify como reserva.
export const CHECKOUT: Record<string, string> = Object.fromEntries(
  [...new Set([...Object.keys(KIWIFY_CHECKOUT), ...Object.keys(CAKTO_CHECKOUT)])].map((k) => [k, CAKTO_CHECKOUT[k] || KIWIFY_CHECKOUT[k] || ""])
);

export const ehCakto = (url: string) => /(^|\/\/)pay\.cakto\.com\.br\//.test(url);

// Monta o link do checkout (função pura: roda no servidor e no navegador).
// O slug da página vai no parâmetro que cada plataforma repassa ao webhook:
//   • Kiwify: só repassa src, sck, utm_*, s1, s2, s3 → slug em `s1`.
//   • Cakto: repassa src, sck e utm_* → slug em `sck`.
// Nome, e-mail e telefone pré-preenchem o checkout (mesmos nomes nas duas).
export function montarCheckout(
  base: string,
  d: { slug: string; buyerName?: string; buyerEmail?: string; buyerPhone?: string },
  extra: Record<string, string> = {}
) {
  const q = new URLSearchParams({ [ehCakto(base) ? "sck" : "s1"]: d.slug, ...extra });
  if (d.buyerName?.trim()) q.set("name", d.buyerName.trim());
  if (d.buyerEmail?.trim()) q.set("email", d.buyerEmail.trim());
  const phone = (d.buyerPhone ?? "").replace(/\D/g, "");
  if (phone) q.set("phone", phone);
  return `${base}?${q.toString()}`;
}

// Qual checkout uma página "pendente" já salva deve usar (mesma regra do quiz).
export function chaveCheckout(p: { style?: string; plan?: string | null; astral?: boolean; qrStyle?: string; retroPlano?: string | null }) {
  const qr = !!p.qrStyle && p.qrStyle !== "simples";
  if (p.style === "retro") return p.retroPlano === "essencial" ? (qr ? "retro-essencial-qr" : "retro-essencial") : "retro";
  if (p.style === "date") return "date";
  const plan = p.plan === "1dia" ? "1dia" : "eterno";
  return [plan, p.astral && "astral", qr && "qr"].filter(Boolean).join("-");
}

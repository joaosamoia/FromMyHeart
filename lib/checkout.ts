// lib/checkout.ts
// Links de checkout da Kiwify, compartilhados entre o quiz (/criar) e a
// prévia (/previa), que precisa mandar a pessoa direto pro pagamento certo.

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
  // Produto à parte na Kiwify (R$ 34,80). O webhook reconhece pelo nome do
  // produto ("… QR Code …"), sem precisar mexer em KIWIFY_PRODUCT_IDS_QR.
  "retro-qr": "https://pay.kiwify.com.br/pds9P8g",
};

// Monta o link do checkout da Kiwify (função pura: roda no servidor e no navegador).
// ⚠️ A Kiwify só repassa ao webhook estes parâmetros: src, sck, utm_*, s1, s2, s3.
// Por isso o slug da página vai em `s1`. Nome, e-mail e telefone pré-preenchem o checkout.
export function montarCheckout(
  base: string,
  d: { slug: string; buyerName?: string; buyerEmail?: string; buyerPhone?: string },
  extra: Record<string, string> = {}
) {
  const q = new URLSearchParams({ s1: d.slug, ...extra });
  if (d.buyerName?.trim()) q.set("name", d.buyerName.trim());
  if (d.buyerEmail?.trim()) q.set("email", d.buyerEmail.trim());
  const phone = (d.buyerPhone ?? "").replace(/\D/g, "");
  if (phone) q.set("phone", phone);
  return `${base}?${q.toString()}`;
}

// Qual checkout uma página "pendente" já salva deve usar (mesma regra do quiz).
export function chaveCheckout(p: { style?: string; plan?: string | null; astral?: boolean; qrStyle?: string }) {
  const qr = !!p.qrStyle && p.qrStyle !== "simples";
  if (p.style === "retro") return qr ? "retro-qr" : "retro";
  if (p.style === "date") return "date";
  const plan = p.plan === "1dia" ? "1dia" : "eterno";
  return [plan, p.astral && "astral", qr && "qr"].filter(Boolean).join("-");
}

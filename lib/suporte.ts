// lib/suporte.ts
// WhatsApp de suporte, usado no fim do formulário, na prévia, nos rodapés e nos e-mails.
// Pra trocar o número, mude só aqui (com 55 + DDD).
export const WHATS_SUPORTE = "5541997878920";
export const WHATS_SUPORTE_EXIBIDO = "(41) 99787-8920";

// api.whatsapp.com (e não wa.me): o redirecionamento do wa.me estraga os emojis.
export function linkSuporte(texto = "Oi! Tenho uma dúvida sobre o FromMyHeart 💛") {
  return `https://api.whatsapp.com/send?phone=${WHATS_SUPORTE}&text=${encodeURIComponent(texto)}`;
}

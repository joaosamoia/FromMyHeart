// lib/oferta.ts
// Oferta de fim de ano. Tudo aqui é configuração: mude as datas, os textos ou
// desligue (ativa: false) sem mexer em mais nada.
//
// A urgência é REAL: os prazos são o Natal e a virada do ano, quando a
// retrospectiva de 2026 deixa de fazer sentido como presente. Não invente
// prazos falsos ("só hoje!") — além de queimar a confiança, o Código de Defesa
// do Consumidor considera propaganda enganosa.

export type Marco = {
  ate: string; // data/hora ISO com fuso de Brasília
  titulo: string; // aparece quando falta bastante tempo
  tituloUrgente: string; // aparece nos últimos `diasUrgente` dias
  sub: string;
};

export const OFERTA = {
  ativa: true,
  diasUrgente: 10,
  marcos: [
    {
      ate: "2026-12-24T20:00:00-03:00",
      titulo: "A retrospectiva de 2026 já está aberta 🎄",
      tituloUrgente: "Últimos dias pra entregar no Natal 🎄",
      sub: "Monte hoje e entregue o ano de vocês na noite de Natal — o link fica pronto na hora.",
    },
    {
      ate: "2026-12-31T23:59:00-03:00",
      titulo: "Feche 2026 com o ano de vocês numa página",
      tituloUrgente: "Últimos dias pra retrospectiva de 2026 ✨",
      sub: "Mande antes da virada: depois de 31/12 ela vira lembrança do ano passado.",
    },
  ] as Marco[],
  // Bônus temporário (opcional). Só ligue se ele for entregue de verdade —
  // ex.: se você baixar o preço do produto "Retrospectiva + QR Code" na Kiwify
  // pra R$ 29,90 até o Natal, use:
  //   bonus: "Até o Natal: QR Code personalizado de presente 🎁",
  bonus: null as string | null,
};

export function marcoAtual(agora = Date.now()) {
  if (!OFERTA.ativa) return null;
  return OFERTA.marcos.find((m) => new Date(m.ate).getTime() > agora) ?? null;
}

// lib/plano.ts
// Planos da Retrospectiva do Casal.
//   • Essencial (R$ 19,99): linha do tempo mais curta, 1 música, sem vale-date.
//     QR Code é adicional (+R$ 4,99).
//   • Completa (R$ 29,99): tudo, já com o QR Code. É a "mais escolhida".
// Quem decide o plano de uma página paga é o webhook (pelo nome da oferta).
// Página sem plano salvo (vendas antigas) conta como Completa.

export type PlanoRetro = "essencial" | "completa";

export const PRECO_RETRO = { essencial: 19.99, essencialQr: 4.99, completa: 29.99 } as const;

export const LIMITES_RETRO = {
  essencial: { meses: 6, musicas: 1, vale: false },
  completa: { meses: 12, musicas: 5, vale: true },
} as const;

export function planoRetro(p: { retroPlano?: string | null }): PlanoRetro {
  return p.retroPlano === "essencial" ? "essencial" : "completa";
}

export function limitesRetro(p: { retroPlano?: string | null }) {
  return LIMITES_RETRO[planoRetro(p)];
}

type Mes = { month: number; title?: string; photo?: string };

// Meses que aparecem na página: no Essencial, os que a pessoa escolheu
// (até 6); se ela não escolheu, os 6 primeiros do ano.
export function mesesDoPlano<T extends Mes>(p: { retroPlano?: string | null; retroMesesEssencial?: number[] }, meses: T[]): T[] {
  const lim = limitesRetro(p).meses;
  const escolhidos = p.retroMesesEssencial;
  if (planoRetro(p) === "essencial" && escolhidos?.length) {
    const sel = meses.filter((m) => escolhidos.includes(m.month));
    if (sel.length) return sel.slice(0, lim);
  }
  return meses.slice(0, lim);
}

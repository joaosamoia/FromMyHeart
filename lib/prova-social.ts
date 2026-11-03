// lib/prova-social.ts
// Depoimentos e páginas reais de clientes, mostrados na home e no /criar.
//
// ⚠️ Só coloque aqui o que for REAL e com PERMISSÃO do cliente:
//   • peça no pós-venda (WhatsApp/e-mail): "posso usar sua mensagem/print no site?"
//   • guarde o print da autorização
//   • nunca use o nome completo — primeiro nome + cidade já basta
//   • `link` só se o casal autorizou deixar a página pública como exemplo
// Depoimento inventado é propaganda enganosa (CDC, art. 37) e derruba a
// confiança se alguém descobrir. Enquanto a lista estiver vazia, a seção
// simplesmente não aparece.

export type Depoimento = {
  nome: string; // ex.: "Camila"
  cidade?: string; // ex.: "Curitiba, PR"
  texto: string; // curto: 1 a 3 frases
  produto?: "retro" | "classica" | "date";
  foto?: string; // opcional: /depoimentos/camila.jpg (print da reação, com permissão)
  link?: string; // opcional: /slug-da-pagina (com permissão)
};

export const DEPOIMENTOS: Depoimento[] = [
  // {
  //   nome: "Camila",
  //   cidade: "Curitiba, PR",
  //   texto: "Mandei a retrospectiva no Natal e ele chorou no meio da ceia. Melhor presente que já dei.",
  //   produto: "retro",
  // },
];

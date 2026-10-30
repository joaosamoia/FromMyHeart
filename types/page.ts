// types/page.ts
// Formato do documento salvo em Firestore, coleção "pages", id = slug.
// Este é o "contrato" entre o quiz (/criar) e a página final (/[slug]).

export type PageStatus = "pendente" | "pago" | "expirado";

export interface CoupleMoment {
  date: string; // yyyy-mm-dd
  icon: string;
  title: string;
  desc?: string;
  photo?: string; // URL do Firebase Storage
}

// ───── Retrospectiva do Casal (style === "retro") ─────
export interface RetroMonth {
  month: number; // 0 = janeiro … 11 = dezembro
  title: string;
  photo?: string; // URL do Firebase Storage
}

export interface RetroSong {
  title: string; // "Perfect - Ed Sheeran"
  url?: string; // link Spotify/YouTube (opcional) — vira player na página
}

export interface RetroStat {
  value: string; // "1.247"
  label: string; // "vezes que eu disse que te amo"
}

export interface CouplePageDoc {
  slug: string;
  style: "classica" | "date" | "retro"; // qual produto/template esta página usa
  title: string;
  startDate: string; // yyyy-mm-dd
  message: string;
  music?: string; // link Spotify/YouTube ou nome da faixa
  photos: string[]; // URLs do Firebase Storage
  moments: CoupleMoment[];
  theme: string; // id do tema (branco-rosa, rosa, oceano, ...)

  // usados só quando style === "date"
  whatsapp?: string; // número de quem está convidando (onde chega a resposta)
  nickname?: string; // apelido carinhoso usado no convite
  dateTemplate?: "sunset" | "ultravioleta"; // qual dos dois layouts do convite

  // usados só quando style === "retro"
  retroYear?: number; // ano da retrospectiva (ex: 2026)
  retroNameA?: string; // quem está presenteando
  retroNameB?: string; // quem recebe
  retroCover?: string; // foto de capa (abertura da página), enviada na 1ª etapa
  retroMonths?: RetroMonth[]; // um momento por mês (só os meses preenchidos)
  retroSongs?: RetroSong[]; // top 5 do casal
  retroStats?: RetroStat[]; // "números do casal" (até 4)
  retroPromises?: string[]; // "promessas pro próximo ano" (até 5)
  retroVoucher?: string; // o que vale o "vale-date" do final (ex: "um jantar no nosso restaurante")

  // dados de contato do comprador (não exibidos na página pública)
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;

  // controle de acesso / pagamento
  status: PageStatus;
  plan: "1dia" | "eterno" | "date" | "retro" | null;
  astral: boolean; // addon do mapa estelar (liberado só pelo webhook, só pra "classica")

  // QR Code personalizado: "qrStyle" é só a escolha estética (cosmética, sem
  // custo diferente entre os dois designs pagos), guardada já no rascunho.
  // "qrPaid" é o que realmente controla se a personalização é aplicada —
  // só o webhook pode marcar isso como true, nunca o próprio quiz.
  qrStyle: "simples" | "romantico" | "juntos";
  qrPaid: boolean;
  qrPhoto?: string; // foto pro centro do QR, só usada se qrPaid === true

  createdAt: number; // Date.now()
  paidAt: number | null;
}

export const emptyCouplePageDoc = (): Omit<
  CouplePageDoc,
  "slug" | "createdAt" | "status" | "plan" | "paidAt" | "qrPaid"
> => ({
  style: "classica",
  title: "",
  startDate: "",
  message: "",
  music: "",
  photos: [],
  moments: [],
  theme: "branco-rosa",
  whatsapp: "",
  nickname: "",
  dateTemplate: "sunset",
  buyerName: "",
  buyerEmail: "",
  buyerPhone: "",
  astral: false,
  qrStyle: "simples",
  retroYear: new Date().getFullYear(),
  retroNameA: "",
  retroNameB: "",
  retroCover: "",
  retroMonths: [],
  retroSongs: [],
  retroStats: [],
  retroPromises: [],
  retroVoucher: "",
});

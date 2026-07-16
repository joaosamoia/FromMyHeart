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

export interface CouplePageDoc {
  slug: string;
  style: "classica" | "date"; // qual produto/template esta página usa
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

  // dados de contato do comprador (não exibidos na página pública)
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;

  // controle de acesso / pagamento
  status: PageStatus;
  plan: "1dia" | "eterno" | "date" | null;
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
  buyerName: "",
  buyerEmail: "",
  buyerPhone: "",
  astral: false,
  qrStyle: "simples",
});

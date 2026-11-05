// lib/previa.ts — só servidor.
// A "prévia" é a retrospectiva que a pessoa montou mas não pagou, mostrada só
// até a linha do tempo (o resto fica trancado) e com marca d'água. Serve pro
// remarketing: em vez de "volte ao carrinho", a mensagem leva a pessoa a ver a
// própria história montada.
//
// Dois tipos de link:
//   /previa/<slug>?t=<token>   página "pendente" (clicou em pagar e não pagou)
//   /previa/r/<id>             rascunho na nuvem (parou antes do pagamento)
//
// O slug é fácil de adivinhar, então a página pendente exige um token (HMAC do
// slug com um segredo). O id do rascunho já é aleatório (24 caracteres).
// Os dados trancados NUNCA saem do servidor: são cortados aqui antes de ir pro
// navegador, então não dá pra "destrancar" pelo inspecionar elemento.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { CouplePageDoc } from "@/types/page";

const segredo = () => process.env.PREVIEW_SECRET || process.env.ADMIN_KEY || "";

export function tokenPrevia(slug: string) {
  const s = segredo();
  if (!s) return "";
  return createHmac("sha256", s).update(`previa:${slug}`).digest("base64url").slice(0, 22);
}

export function tokenValido(slug: string, t: string | undefined) {
  const certo = tokenPrevia(slug);
  if (!certo || !t || t.length !== certo.length) return false;
  return timingSafeEqual(Buffer.from(certo), Buffer.from(t));
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://datecriativo.fun").replace(/\/$/, "");
}

export const linkPreviaPagina = (slug: string) => `${siteUrl()}/previa/${encodeURIComponent(slug)}?t=${tokenPrevia(slug)}`;
export const linkPreviaRascunho = (id: string) => `${siteUrl()}/previa/r/${id}`;

// Quantos meses da linha do tempo aparecem na prévia.
export const MESES_NA_PREVIA = 3;

export type Trancado = { meses: number; musicas: number; numeros: number; promessas: number; carta: boolean; vale: boolean };

type Doc = Partial<CouplePageDoc>;

// Corta o que fica trancado e devolve só o que pode ir pro navegador
// (sem dados de contato do comprador).
export function cortarParaPrevia(page: Doc): { publico: Doc; trancado: Trancado } {
  const meses = [...(page.retroMonths ?? [])].filter((m) => m.title?.trim() || m.photo).sort((a, b) => a.month - b.month);
  const musicas = (page.retroSongs ?? []).filter((s) => s.title?.trim() || s.url?.trim());
  const numeros = (page.retroStats ?? []).filter((s) => s.value?.trim() && s.label?.trim());
  const promessas = (page.retroPromises ?? []).filter((p) => p?.trim());

  const publico: Doc = {
    slug: page.slug,
    style: "retro",
    theme: page.theme,
    startDate: page.startDate,
    retroYear: page.retroYear,
    retroNameA: page.retroNameA,
    retroNameB: page.retroNameB,
    retroCover: page.retroCover,
    retroMonths: meses.slice(0, MESES_NA_PREVIA),
    // só a música nº 1, pro player de baixo (a pessoa ouve a "trilha" na prévia)
    retroSongs: musicas.slice(0, 1),
    photos: [],
    retroStats: [],
    retroPromises: [],
    message: "",
    retroVoucher: "",
  };

  return {
    publico,
    trancado: {
      meses: Math.max(0, meses.length - MESES_NA_PREVIA),
      musicas: musicas.length,
      numeros: numeros.length,
      promessas: promessas.length,
      carta: !!page.message?.trim(),
      vale: true, // o vale-date do final sempre existe
    },
  };
}

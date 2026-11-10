// app/presente/page.tsx
// Link da bio: datecriativo.fun/presente
// A pessoa "abre o presente" (a retrospectiva de exemplo, com a capa de
// envelope), sente o que vai dar pro mozão, e uma barra fixa leva pro /criar.
//   /presente?tema=scrap-sol   → abre com outro visual (pra testar nos vídeos)
// Os parâmetros da URL (utm_*, src…) seguem junto pro /criar.
import type { Metadata } from "next";
import { DEMO_RETRO } from "@/lib/demo-retro";
import Presente from "./Presente";

export const metadata: Metadata = {
  title: "Abre o seu presente 💌 · FromMyHeart",
  description: "Veja como fica a retrospectiva do ano de vocês e faça a sua em 5 minutos.",
  openGraph: {
    title: "Abre o seu presente 💌",
    description: "Veja como fica a retrospectiva do ano de vocês e faça a sua em 5 minutos.",
  },
};

export default async function PresentePage({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return <Presente page={{ ...DEMO_RETRO, theme: tema || DEMO_RETRO.theme }} />;
}

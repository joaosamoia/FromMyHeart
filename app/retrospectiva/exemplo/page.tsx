// app/retrospectiva/exemplo/page.tsx
// Demo pública da Retrospectiva do Casal, com dados fictícios. Serve pra:
//   • gravar os vídeos de TikTok/Reels (tela do celular rolando a página)
//   • linkar na bio / anúncio como "veja um exemplo"
// As fotos de public/exemplo/ são provisórias (desenhos genéricos): troque por
// fotos de banco de imagem ou de um casal que autorizou o uso, com os MESMOS
// nomes de arquivo (foto-1.jpg … foto-6.jpg).
//
// Tema pela URL (pra testar os formatos nos anúncios):
//   /retrospectiva/exemplo                    → Kraft Polaroid (padrão)
//   /retrospectiva/exemplo?tema=scrap-sol     → Colagem Sol
//   /retrospectiva/exemplo?tema=retro-paixao  → Colorido

import type { Metadata } from "next";
import RetroStories from "@/components/RetroStories";
import { DEMO_RETRO as DEMO } from "@/lib/demo-retro";

export const metadata: Metadata = {
  title: "Exemplo · Retrospectiva do Casal",
  description: "Veja como fica a retrospectiva do ano de vocês. ♥",
};

export default async function RetroExemplo({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return <RetroStories page={{ ...DEMO, theme: tema || DEMO.theme }} />;
}

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
import type { CouplePageDoc } from "@/types/page";

export const metadata: Metadata = {
  title: "Exemplo · Retrospectiva do Casal",
  description: "Veja como fica a retrospectiva do ano de vocês. ♥",
};

const ano = new Date().getFullYear();

const DEMO: Partial<CouplePageDoc> = {
  style: "retro",
  theme: "scrap-kraft",
  retroYear: ano,
  retroNameA: "Julia",
  retroNameB: "João",
  startDate: `${ano - 2}-06-12`,
  retroMonths: [
    { month: 0, title: "Réveillon na praia, de pé na areia", photo: "/exemplo/foto-1.jpg" },
    { month: 2, title: "Aquele jantar que deu tudo errado (e foi perfeito)", photo: "/exemplo/foto-2.jpg" },
    { month: 5, title: "Nosso aniversário de namoro", photo: "/exemplo/foto-3.jpg" },
    { month: 8, title: "Primeira viagem só nós dois", photo: "/exemplo/foto-4.jpg" },
    { month: 10, title: "Maratona de série no sofá, chuva lá fora" },
    { month: 11, title: "Montamos a árvore de Natal juntos", photo: "/exemplo/foto-5.jpg" },
  ],
  retroSongs: [
    { title: "Perfect - Ed Sheeran" },
    { title: "Meu Abrigo - Melim" },
    { title: "Trem-Bala - Ana Vilela" },
    { title: "All of Me - John Legend" },
    { title: "Velha Infância - Tribalistas" },
  ],
  retroStats: [
    { value: "1.247", label: "vezes que eu disse “te amo”" },
    { value: "57", label: "pizzas divididas (você comeu mais)" },
    { value: "38", label: "brigas por causa de onde jantar" },
  ],
  retroPromises: ["Viajar pra um lugar novo juntos", "Mais encontros sem celular", "Nunca dormir brigados"],
  message:
    "Esse ano teve de tudo: risada, perrengue, viagem, briga boba e muito colo. E em todos os dias, o melhor pedaço foi você. Que o próximo seja ainda mais nosso. Te amo. ♥",
};

export default async function RetroExemplo({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return <RetroStories page={{ ...DEMO, theme: tema || DEMO.theme }} />;
}

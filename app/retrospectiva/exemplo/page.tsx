// app/retrospectiva/exemplo/page.tsx
// Demo pública da Retrospectiva do Casal, com dados fictícios. Serve pra:
//   • gravar os vídeos de TikTok/Reels (tela do celular rolando a página)
//   • linkar na bio / anúncio como "veja um exemplo"
// Troque as fotos por fotos de banco de imagem ou de um casal que autorizou.
// Tema pela URL: /retrospectiva/exemplo?tema=retro-neon

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
  theme: "retro-paixao",
  retroYear: ano,
  retroNameA: "Maria",
  retroNameB: "João",
  startDate: `${ano - 2}-06-12`,
  retroMonths: [
    { month: 0, title: "Réveillon na praia, de pé na areia" },
    { month: 2, title: "Aquele jantar que deu tudo errado (e foi perfeito)" },
    { month: 5, title: "Nosso aniversário de namoro" },
    { month: 8, title: "Primeira viagem só nós dois" },
    { month: 11, title: "Montamos a árvore de Natal juntos" },
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
  message:
    "Esse ano teve de tudo: risada, perrengue, viagem, briga boba e muito colo. E em todos os dias, o melhor pedaço foi você. Que o próximo seja ainda mais nosso. Te amo. ♥",
};

export default async function RetroExemplo({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return <RetroStories page={{ ...DEMO, theme: tema || DEMO.theme }} />;
}

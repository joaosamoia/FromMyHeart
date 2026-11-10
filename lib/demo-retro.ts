// lib/demo-retro.ts
// Retrospectiva de exemplo (dados fictícios), usada em /retrospectiva/exemplo e /presente.
import type { CouplePageDoc } from "@/types/page";

const ano = new Date().getFullYear();

export const DEMO_RETRO: Partial<CouplePageDoc> = {
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
    { title: "Perfect - Ed Sheeran", url: "https://open.spotify.com/track/0tgVpDi06FyKpA1z0VMD4v" },
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
  retroVoucher: "um jantar no nosso restaurante favorito",
  retroCover: "/exemplo/foto-1.jpg",
  message:
    "Esse ano teve de tudo: risada, perrengue, viagem, briga boba e muito colo. E em todos os dias, o melhor pedaço foi você. Que o próximo seja ainda mais nosso. Te amo. ♥",
};

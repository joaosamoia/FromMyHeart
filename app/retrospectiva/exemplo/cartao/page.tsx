// app/retrospectiva/exemplo/cartao/page.tsx
// Exemplo do cartão com QR Code (adicional pago), com dados fictícios —
// pra mostrar o adicional em anúncio/vídeo. Tema: ?tema=scrap-sol
import type { Metadata } from "next";
import CardView from "@/app/[slug]/cartao/CardView";

export const metadata: Metadata = { title: "Exemplo · Cartão com QR Code", robots: { index: false } };

export default async function CartaoExemplo({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  const ano = new Date().getFullYear();
  return (
    <CardView
      slug="retrospectiva/exemplo"
      page={{ theme: tema || "scrap-kraft", retroYear: ano, retroNameA: "Julia", retroNameB: "João", retroCover: "/exemplo/foto-1.jpg" }}
    />
  );
}

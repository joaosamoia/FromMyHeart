// app/[slug]/cartao/page.tsx
// Cartão pra imprimir com o QR Code personalizado (adicional pago da
// Retrospectiva). Pra quem quer entregar o presente em mãos: o QR abre a
// página, e no meio dele vai a foto de capa do casal.
//
// Só aparece se a página estiver paga E o adicional do QR tiver sido comprado
// (qrPaid, marcado pelo webhook). Tamanho A6 (10,5 × 14,8 cm) na impressão.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import type { CouplePageDoc } from "@/types/page";
import CardView from "./CardView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cartão com QR Code", robots: { index: false } };

export default async function Cartao({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const snap = await getAdminDb().collection("pages").doc(slug).get();
  if (!snap.exists) notFound();
  const page = snap.data() as CouplePageDoc;
  if (page.status !== "pago") notFound();


  if (!page.qrPaid) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#2B0B3F", color: "#FFF4F7", fontFamily: "Inter, sans-serif", textAlign: "center" }}>
        <div style={{ maxWidth: 340 }}>
          <div style={{ fontSize: 40 }}>💌</div>
          <h1 style={{ fontSize: 22, margin: "12px 0 8px" }}>Cartão com QR Code não incluso</h1>
          <p style={{ color: "#FFD9E4", lineHeight: 1.5 }}>Esse cartão pra imprimir faz parte do adicional “QR Code personalizado”. A sua retrospectiva continua no ar normalmente.</p>
        </div>
      </main>
    );
  }

  return <CardView page={page} slug={slug} />;
}

// app/previa/r/[id]/page.tsx
// Prévia de um rascunho na nuvem (a pessoa parou antes de chegar no pagamento).
// Link: /previa/r/<id do rascunho>. O id já é aleatório, não precisa de token.
// O botão leva de volta pro /criar com tudo preenchido, pra ela terminar e pagar.
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import { contarEvento } from "@/lib/funil-server";
import { cortarParaPrevia } from "@/lib/previa";
import type { CouplePageDoc } from "@/types/page";
import Previa from "@/components/Previa";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "A prévia da sua retrospectiva ♥",
  description: "Olha como ficou a retrospectiva de vocês.",
  robots: { index: false, follow: false },
};

const ID = /^[A-Za-z0-9]{24}$/;

export default async function PreviaRascunho({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) notFound();

  const db = getAdminDb();
  const snap = await db.collection("rascunhos").doc(id).get();
  if (!snap.exists) notFound();
  const d = (snap.data()?.d ?? {}) as Partial<CouplePageDoc>;
  if (d.style !== "retro") redirect(`/criar?rascunho=${id}`);

  // se esse rascunho já virou uma página paga, abre a página de verdade
  const slug = typeof d.slug === "string" ? d.slug.replace(/-+$/, "") : "";
  if (slug) {
    const pg = await db.collection("pages").doc(slug).get().catch(() => null);
    if (pg?.exists && pg.data()?.status === "pago") redirect(`/${encodeURIComponent(slug)}`);
  }

  await contarEvento("retro", "previa_vista").catch(() => {});

  const { publico, trancado } = cortarParaPrevia(d);
  return (
    <Previa
      page={publico}
      trancado={trancado}
      href={`/criar?rascunho=${id}`}
      rotulo="Terminar e liberar"
    />
  );
}

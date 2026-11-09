// app/previa/[slug]/page.tsx
// Prévia de uma página "pendente" (a pessoa clicou em pagar e não pagou).
// Link: /previa/<slug>?t=<token> — o token vem de lib/previa.ts (tokenPrevia).
// O botão leva direto pro checkout certo da Kiwify, já preenchido.
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import { contarEvento } from "@/lib/funil-server";
import { cortarParaPrevia, tokenValido, siteUrl } from "@/lib/previa";
import { CHECKOUT, chaveCheckout, montarCheckout } from "@/lib/checkout";
import type { CouplePageDoc } from "@/types/page";
import Previa from "@/components/Previa";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "A prévia da sua retrospectiva ♥",
  description: "Olha como ficou a retrospectiva de vocês.",
  robots: { index: false, follow: false },
};

export default async function PreviaPagina({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;
  if (!tokenValido(slug, t)) notFound();

  const snap = await getAdminDb().collection("pages").doc(slug).get();
  if (!snap.exists) notFound();
  const page = snap.data() as CouplePageDoc;

  // já pagou: manda pra página de verdade
  if (page.status === "pago") redirect(`/${encodeURIComponent(slug)}`);
  // por enquanto a prévia existe só pra Retrospectiva
  if (page.style !== "retro") redirect("/criar");

  await contarEvento("retro", "previa_vista").catch(() => {});

  const { publico, trancado } = cortarParaPrevia(page);
  const chave = chaveCheckout(page);
  const href = montarCheckout(CHECKOUT[chave], page, { utm_source: "previa" });
  const preco = chave === "retro-qr" ? "R$ 34,98" : "R$ 29,99";

  return (
    <Previa
      page={publico}
      trancado={trancado}
      href={href}
      rotulo="Liberar retrospectiva"
      preco={preco}
      linkFinal={`${siteUrl().replace(/^https?:\/\//, "")}/${slug}`}
    />
  );
}

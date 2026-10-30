// app/[slug]/page.tsx
// Página pública do casal. Server Component: roda no servidor (SSR), o que é
// essencial pra o preview do link ficar bonito no WhatsApp/iMessage (generateMetadata
// abaixo) e pra nunca vazar dados de quem ainda não pagou.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import type { CouplePageDoc } from "@/types/page";
import CouplePageContent from "@/components/CouplePageContent";
import DatePage from "@/components/DatePage";
import RetroStories from "@/components/RetroStories";

// Força renderização dinâmica: esta página lê dados que mudam (status de
// pagamento), então nunca deve ser cacheada estaticamente pelo Next.js.
export const dynamic = "force-dynamic";

async function getPage(slug: string): Promise<CouplePageDoc | null> {
  const snap = await getAdminDb().collection("pages").doc(slug).get();
  if (!snap.exists) return null;
  return snap.data() as CouplePageDoc;
}

// Isso é o que faz o link ficar bonito quando compartilhado no WhatsApp/iMessage.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page || page.status !== "pago") {
    return { title: "Site do Amor" };
  }
  if (page.style === "retro") {
    const t = `Nosso ${page.retroYear ?? ""} · ${page.retroNameA ?? ""} & ${page.retroNameB ?? ""}`;
    const cover = page.retroMonths?.find((m) => m.photo)?.photo;
    return {
      title: t,
      description: "Fiz a retrospectiva do nosso ano. Toque pra abrir. ♥",
      openGraph: { title: t, description: "Fiz a retrospectiva do nosso ano. Toque pra abrir. ♥", images: cover ? [cover] : undefined },
    };
  }
  return {
    title: page.title || "Uma página de amor",
    description: "Alguém preparou uma surpresa especial pra você. ♥",
    openGraph: {
      title: page.title || "Uma página de amor",
      description: "Alguém preparou uma surpresa especial pra você. ♥",
      images: page.photos?.[0] ? [page.photos[0]] : undefined,
    },
  };
}

export default async function CouplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPage(slug);

  // Nunca existiu esse slug
  if (!page) notFound();

  // Existe mas o pagamento ainda não foi confirmado pelo webhook da Kiwify
  if (page.status !== "pago") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
          fontFamily: "Inter, sans-serif",
          background: "#2B0B3F",
        }}
      >
        <div>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#FFF4F7", fontFamily: "'Bricolage Grotesque', Inter, sans-serif", letterSpacing: "-0.02em" }}>
            Esta página ainda não foi ativada
          </h1>
          <p style={{ color: "#FFD9E4", marginTop: 8, maxWidth: 320 }}>
            Assim que o pagamento for confirmado, ela é liberada automaticamente.
          </p>
        </div>
      </div>
    );
  }

  if (page.style === "date") {
    return (
      <div style={{ minHeight: "100vh" }}>
        <DatePage whatsapp={page.whatsapp} nickname={page.nickname} big />
      </div>
    );
  }

  if (page.style === "retro") return <RetroStories page={page} />;

  return <CouplePageContent page={page} />;
}

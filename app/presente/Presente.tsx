"use client";
// A retrospectiva de exemplo em tela cheia + uma barra fixa que aparece
// depois que a pessoa abre o envelope e começa a rolar.
import { useEffect, useState } from "react";
import RetroStories from "@/components/RetroStories";
import { track } from "@/lib/funil";
import type { CouplePageDoc } from "@/types/page";

const DESTINO = "/criar?estilo=retro";

export default function Presente({ page }: { page: Partial<CouplePageDoc> }) {
  const [mostrar, setMostrar] = useState(false);
  const [href, setHref] = useState(DESTINO);

  useEffect(() => {
    track("retro", "bio_previa", { unico: true });
    // leva utm/src da bio junto pro /criar
    const q = new URLSearchParams(window.location.search);
    q.delete("tema");
    q.set("estilo", "retro");
    q.set("src", q.get("src") || "bio");
    setHref(`/criar?${q.toString()}`);

    const onScroll = () => {
      if (window.scrollY > 220) {
        setMostrar(true);
        track("retro", "bio_rolou", { unico: true });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // quem só abriu e ficou olhando também vê o botão
    const t = window.setTimeout(() => setMostrar(true), 9000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(t);
    };
  }, []);

  // a barra fica embaixo: o player de música sobe pra não ficar escondido
  useEffect(() => {
    document.documentElement.style.setProperty("--fmh-dock-lift", mostrar ? "78px" : "0px");
    return () => {
      document.documentElement.style.removeProperty("--fmh-dock-lift");
    };
  }, [mostrar]);

  return (
    <>
      <RetroStories page={page} />
      <div
        aria-hidden={!mostrar}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 60,
          padding: "10px 14px calc(12px + env(safe-area-inset-bottom))",
          background: "linear-gradient(to top, rgba(20,8,20,.92), rgba(20,8,20,.75) 70%, rgba(20,8,20,0))",
          transform: mostrar ? "translateY(0)" : "translateY(110%)",
          transition: "transform .45s cubic-bezier(.2,.8,.2,1)",
          pointerEvents: mostrar ? "auto" : "none",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, color: "#fff", fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.25 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Gostou? Faça a de vocês 💌</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Com as suas fotos, em 5 min</div>
          </div>
          <a
            href={href}
            onClick={() => track("retro", "bio_cta", { unico: true })}
            style={{
              flexShrink: 0,
              padding: "13px 18px",
              borderRadius: 99,
              background: "linear-gradient(90deg,#E8336D,#FF7A59)",
              color: "#fff",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 15,
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 6px 18px rgba(232,51,109,.45)",
              whiteSpace: "nowrap",
            }}
          >
            Criar a nossa →
          </a>
        </div>
      </div>
    </>
  );
}

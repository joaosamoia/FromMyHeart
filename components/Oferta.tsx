"use client";

// components/Oferta.tsx
// Faixa da oferta de fim de ano com contador AO VIVO até o próximo marco real
// (Natal, depois a virada). Configuração em lib/oferta.ts.
//
// Só renderiza no navegador: o contador muda a cada segundo, então se viesse
// pronto do servidor o número piscaria ao carregar.

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { OFERTA, marcoAtual } from "@/lib/oferta";
import { BR, D_FONT } from "@/components/brand";

const noop = () => () => {};
const useNoNavegador = () => useSyncExternalStore(noop, () => true, () => false);

function partes(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const dd = (n: number) => String(n).padStart(2, "0");

export function OfertaBanner({ variante = "home" }: { variante?: "home" | "compacta" }) {
  const noNavegador = useNoNavegador();
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!noNavegador) return null;
  const marco = marcoAtual(agora);
  if (!marco) return null;

  const falta = new Date(marco.ate).getTime() - agora;
  const t = partes(falta);
  const urgente = t.d < OFERTA.diasUrgente;
  const titulo = urgente ? marco.tituloUrgente : marco.titulo;
  const blocos: [number, string][] = [
    [t.d, t.d === 1 ? "dia" : "dias"],
    [t.h, "h"],
    [t.m, "min"],
    [t.s, "seg"],
  ];

  if (variante === "compacta")
    return (
      <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 14, background: urgente ? BR.pink : BR.wine, color: BR.cream, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.25 }}>{titulo}</div>
          {OFERTA.bonus && <div style={{ fontSize: 12, color: BR.yellow, fontWeight: 700, marginTop: 2 }}>{OFERTA.bonus}</div>}
        </div>
        <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", color: BR.yellow, fontVariantNumeric: "tabular-nums" }}>
          {t.d > 0 ? `${t.d}d ` : ""}
          {dd(t.h)}:{dd(t.m)}:{dd(t.s)}
        </div>
      </div>
    );

  return (
    <section style={{ position: "relative", background: urgente ? BR.pink : BR.yellow, color: BR.wine, padding: "26px 20px 28px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "clamp(22px, 6vw, 30px)", lineHeight: 1.05, letterSpacing: "-0.02em", color: urgente ? BR.cream : BR.wine }}>{titulo}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.45, margin: "8px auto 16px", maxWidth: 420, color: urgente ? BR.cream : BR.wine, opacity: 0.9 }}>{marco.sub}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }} aria-label="tempo restante">
          {blocos.map(([n, l]) => (
            <div key={l} style={{ minWidth: 62, padding: "8px 6px 6px", borderRadius: 14, background: BR.wine, color: BR.cream, boxShadow: `0 4px 0 ${BR.night}` }}>
              <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: 26, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{l === "dias" || l === "dia" ? n : dd(n)}</div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
        {OFERTA.bonus && <div style={{ marginTop: 14, fontSize: 14, fontWeight: 800, color: urgente ? BR.yellow : BR.pink }}>{OFERTA.bonus}</div>}
        <Link
          href="/criar?estilo=retro"
          className="br-btn"
          style={{ display: "inline-flex", marginTop: 18, padding: "14px 26px", borderRadius: 99, background: BR.wine, color: BR.cream, fontFamily: D_FONT, fontWeight: 800, fontSize: 16, textDecoration: "none", boxShadow: `0 5px 0 ${BR.night}` }}
        >
          Montar a nossa retrospectiva →
        </Link>
      </div>
    </section>
  );
}

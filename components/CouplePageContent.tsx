"use client";

// components/CouplePageContent.tsx
// Renderização visual da página do casal — usada em DOIS lugares:
//   1. app/[slug]/page.tsx — a página final publicada (dados vindos do Firestore)
//   2. app/criar/page.tsx — o preview AO VIVO enquanto o cliente preenche o quiz
// Por isso aceita um objeto parcial (Partial), com valores default sensatos.

import { useEffect, useState, useRef, useMemo } from "react";
import type { CouplePageDoc } from "@/types/page";

export const THEMES: Record<
  string,
  { name: string; screen: string; glow: string; accent: string; ink: string; sub: string; dark: boolean }
> = {
  "branco-rosa": { name: "Branco e Rosa", screen: "linear-gradient(180deg,#fdf2f7,#ffffff)", glow: "rgba(236,75,147,0.18)", accent: "#ec4b93", ink: "#2c2333", sub: "#a493ad", dark: false },
  rosa: { name: "Rosa", screen: "linear-gradient(180deg,#3d1526,#7a2846)", glow: "rgba(255,158,196,0.28)", accent: "#ff9ec4", ink: "#fff5f9", sub: "#e2b6c8", dark: true },
  oceano: { name: "Oceano", screen: "linear-gradient(180deg,#0f2438,#1e3a5f)", glow: "rgba(108,197,240,0.25)", accent: "#6cc5f0", ink: "#f0f7fc", sub: "#a9c8dd", dark: true },
  "por-do-sol": { name: "Pôr do Sol", screen: "linear-gradient(180deg,#3a1530,#8a3c52 55%,#d47a52)", glow: "rgba(255,180,120,0.3)", accent: "#ffcf8a", ink: "#fff6ee", sub: "#f0c9b0", dark: true },
  floresta: { name: "Floresta", screen: "linear-gradient(180deg,#0e2820,#1f5a3f)", glow: "rgba(143,224,168,0.25)", accent: "#8fe0a8", ink: "#eef8f1", sub: "#b0d4bf", dark: true },
  lavanda: { name: "Lavanda", screen: "linear-gradient(180deg,#2e1d4a,#5b3b8c)", glow: "rgba(201,168,240,0.28)", accent: "#c9a8f0", ink: "#f5f0fc", sub: "#c8b8dd", dark: true },
  "meia-noite": { name: "Meia-noite", screen: "linear-gradient(180deg,#0a0d15,#1c2130)", glow: "rgba(157,180,224,0.22)", accent: "#9db4e0", ink: "#eef1f8", sub: "#8592ab", dark: true },
  aurora: { name: "Aurora Boreal", screen: "linear-gradient(180deg,#0a2b2c,#155f57 60%,#2f8f78)", glow: "rgba(127,234,208,0.28)", accent: "#7fead0", ink: "#eefaf6", sub: "#a8dccb", dark: true },
  galaxia: { name: "Galáxia", screen: "radial-gradient(120% 80% at 50% 0%,#4a2d82,#2a1a55 55%,#0d0a24)", glow: "rgba(199,155,240,0.3)", accent: "#c79bf0", ink: "#f4eefb", sub: "#b6a4d8", dark: true },
  petalas: { name: "Pétalas de Rosa", screen: "linear-gradient(180deg,#1c0a14,#4a1a30)", glow: "rgba(242,160,192,0.28)", accent: "#f2a0c0", ink: "#fdeef4", sub: "#d8a8bc", dark: true },
};

export function getTheme(id?: string) {
  return THEMES[id ?? "branco-rosa"] ?? THEMES["branco-rosa"];
}

function toEmbed(url?: string) {
  if (!url) return null;
  try {
    if (url.includes("spotify.com")) {
      const id = url.split("/track/")[1]?.split("?")[0];
      if (id) return { type: "spotify" as const, src: `https://open.spotify.com/embed/track/${id}` };
    }
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const id = url.includes("youtu.be")
        ? url.split("youtu.be/")[1]?.split("?")[0]
        : new URLSearchParams(url.split("?")[1] ?? "").get("v");
      if (id) return { type: "youtube" as const, src: `https://www.youtube.com/embed/${id}` };
    }
  } catch {}
  return null;
}

function useLiveCounter(startDate?: string) {
  const [t, setT] = useState<any>({});
  useEffect(() => {
    if (!startDate) {
      setT({});
      return;
    }
    const start = new Date(startDate + "T00:00:00");
    const tick = () => {
      const now = new Date();
      let y = now.getFullYear() - start.getFullYear();
      let mo = now.getMonth() - start.getMonth();
      let da = now.getDate() - start.getDate();
      if (da < 0) {
        mo--;
        da += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      }
      if (mo < 0) {
        y--;
        mo += 12;
      }
      const ms = now.getTime() - start.getTime();
      const rem = ms % 86400000;
      setT({
        y,
        mo,
        da,
        h: Math.floor(rem / 3600000),
        mi: Math.floor((rem % 3600000) / 60000),
        se: Math.floor((rem % 60000) / 1000),
        total: Math.floor(ms / 86400000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startDate]);
  return t;
}

// corações ambientes flutuando (decorativo, discreto)
function FloatingHearts({ accent }: { accent: string }) {
  const items = useRef(
    Array.from({ length: 10 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 8,
      dur: 7 + Math.random() * 8,
      size: 9 + Math.random() * 12,
      op: 0.08 + Math.random() * 0.16,
    }))
  ).current;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`@keyframes cpFloat{to{transform:translateY(-115%) rotate(30deg);opacity:0;}}`}</style>
      {items.map((h, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${h.left}%`,
            bottom: "-10%",
            fontSize: h.size,
            color: accent,
            opacity: h.op,
            animation: `cpFloat ${h.dur}s linear ${h.delay}s infinite`,
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}

type PreviewDoc = Partial<CouplePageDoc> & { slug?: string };

export default function CouplePageContent({
  page,
  compact = false,
}: {
  page: PreviewDoc;
  /** true = renderização compacta pro preview lateral do quiz (fontes menores) */
  compact?: boolean;
}) {
  const th = getTheme(page.theme);
  const t = useLiveCounter(page.startDate);
  const embed = toEmbed(page.music);
  const has = !!page.startDate && t.total !== undefined;
  const dateLabel = has
    ? new Date(page.startDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const pad = (n: number) => String(n ?? 0).padStart(2, "0");
  const cardBg = th.dark ? "rgba(255,255,255,0.08)" : "#fff";
  const line = th.dark ? "rgba(255,255,255,0.16)" : "#fbe1ec";
  const photos = page.photos ?? [];
  const moments = page.moments ?? [];

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % photos.length), 3000);
    return () => clearInterval(id);
  }, [photos.length]);

  const F = compact ? 0.82 : 1;

  return (
    <div
      style={{
        minHeight: compact ? "auto" : "100vh",
        background: th.screen,
        fontFamily: "'Playfair Display', Georgia, serif",
        position: "relative",
        overflow: "hidden",
        borderRadius: compact ? 24 : 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: compact ? 200 : 340,
          background: `radial-gradient(70% 60% at 50% 0%, ${th.glow}, transparent)`,
          pointerEvents: "none",
        }}
      />
      <FloatingHearts accent={th.accent} />
      <div
        style={{
          position: "relative",
          maxWidth: 560,
          margin: "0 auto",
          padding: compact ? "36px 20px 40px" : "60px 24px 72px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 34 * F, animation: "cpBeat 1.7s ease-in-out infinite" }}>
          <style>{`@keyframes cpBeat{0%,100%{transform:scale(1);}14%{transform:scale(1.14);}28%{transform:scale(1);}42%{transform:scale(1.08);}70%{transform:scale(1);}}`}</style>
          ♥
        </div>
        <h1
          style={{
            fontSize: 26 * F,
            fontWeight: 600,
            color: th.ink,
            marginTop: 10,
            lineHeight: 1.2,
          }}
        >
          {page.title || "Título da página"}
        </h1>

        {has ? (
          <>
            <div style={{ fontSize: 12 * F, color: th.sub, marginTop: 8 }}>Juntos desde {dateLabel}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {[
                [t.y, "ANO"],
                [t.mo, "MESES"],
                [t.da, "DIAS"],
              ].map(([n, l]) => (
                <div
                  key={l as string}
                  style={{
                    minWidth: 54 * F,
                    padding: "10px 6px",
                    borderRadius: 12,
                    background: cardBg,
                    border: `1px solid ${line}`,
                  }}
                >
                  <div style={{ fontSize: 22 * F, fontWeight: 700, color: th.accent }}>{n as number}</div>
                  <div style={{ fontSize: 8 * F, letterSpacing: "0.14em", color: th.sub, marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 10,
                padding: "6px 16px",
                borderRadius: 99,
                background: cardBg,
                border: `1px solid ${line}`,
                fontSize: 13 * F,
                letterSpacing: "0.06em",
                color: th.accent,
              }}
            >
              {pad(t.h)} : {pad(t.mi)} : {pad(t.se)}
            </div>
            <div style={{ marginTop: 10, fontSize: 11 * F, color: th.sub }}>
              ✨ São <b style={{ color: th.accent }}>{t.total}</b> dias de amor ✨
            </div>
          </>
        ) : (
          <div
            style={{
              marginTop: 16,
              padding: "12px 18px",
              borderRadius: 14,
              background: cardBg,
              border: `1px solid ${line}`,
            }}
          >
            <div style={{ fontSize: 22 * F, fontWeight: 700, color: th.accent }}>0</div>
            <div style={{ fontSize: 8 * F, letterSpacing: "0.14em", color: th.sub }}>DIAS</div>
          </div>
        )}

        {embed && (
          <div style={{ marginTop: 26, width: "100%", maxWidth: 380 }}>
            <iframe
              title="música"
              src={embed.src}
              width="100%"
              height={embed.type === "spotify" ? 132 : 180}
              style={{ borderRadius: 12, border: "none" }}
            />
          </div>
        )}

        {photos.length > 0 && (
          <div style={{ marginTop: 26, width: "100%", maxWidth: 300 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4/5",
                borderRadius: 14,
                overflow: "hidden",
                border: `1px solid ${line}`,
              }}
            >
              {photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p}
                  alt=""
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: i === slide ? 1 : 0,
                    transition: "opacity .8s ease",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {moments.length > 0 && (
          <div style={{ marginTop: 30, width: "100%", maxWidth: 380, textAlign: "left" }}>
            <div style={{ fontSize: 15 * F, fontWeight: 600, color: th.ink, textAlign: "center", marginBottom: 8 }}>
              Nossa História
            </div>
            {moments.map((m, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 18 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: th.accent, marginTop: 6 }} />
                  {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: th.accent, opacity: 0.3 }} />}
                </div>
                <div style={{ paddingBottom: 16 }}>
                  <div style={{ fontSize: 9.5 * F, fontWeight: 700, color: th.accent }}>
                    {m.date &&
                      new Date(m.date + "T00:00:00")
                        .toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
                        .toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13 * F, fontWeight: 600, color: th.ink }}>{m.title}</div>
                  {m.desc && <div style={{ fontSize: 11 * F, color: th.sub, marginTop: 2 }}>{m.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 28,
            padding: "14px",
            borderRadius: 14,
            background: th.dark ? "rgba(255,255,255,0.06)" : "#fdf2f7",
            border: `1px solid ${line}`,
            width: "100%",
            maxWidth: 380,
            boxSizing: "border-box",
          }}
        >
          <p style={{ margin: 0, fontSize: 13 * F, lineHeight: 1.55, color: page.message ? th.ink : th.sub, fontStyle: "italic" }}>
            {page.message ? `"${page.message}"` : "Sua mensagem de amor aparecerá aqui..."}
          </p>
        </div>

        {page.slug && (
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=${compact ? 110 : 180}x${compact ? 110 : 180}&data=${encodeURIComponent(
                  `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${page.slug}`
                )}`}
                alt="QR code da página"
                width={compact ? 90 : 130}
                height={compact ? 90 : 130}
                style={{ borderRadius: 10, border: `1px solid ${line}` }}
              />
              {page.qrPaid && page.qrPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.qrPhoto}
                  alt=""
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: "2px solid #fff",
                    objectFit: "cover",
                  }}
                />
              )}
            </div>
            <div style={{ fontSize: 10 * F, color: th.sub, marginTop: 6 }}>escaneie ou imprima pra presentear</div>
          </div>
        )}

        <div style={{ marginTop: 30, fontSize: 9.5 * F, color: th.sub }}>
          feito com ♥{page.slug ? <> · <a href="/criar" style={{ color: th.accent, textDecoration: "underline" }}>crie sua própria página</a></> : null}
        </div>
      </div>
    </div>
  );
}

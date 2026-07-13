"use client";

// app/[slug]/PageContent.tsx
// Renderização visual da página do casal — versão de produção do "PageContent"
// que prototipamos no artifact. Roda no cliente (precisa de useState/useEffect
// pro contador ao vivo), mas a página em volta (page.tsx) já é SSR.

import { useEffect, useState } from "react";
import type { CouplePageDoc } from "@/types/page";

const THEMES: Record<string, any> = {
  "branco-rosa": {
    screen: "linear-gradient(180deg,#fdf2f7,#ffffff)",
    glow: "rgba(236,75,147,0.18)",
    accent: "#ec4b93",
    ink: "#2c2333",
    sub: "#a493ad",
    dark: false,
  },
  rosa: {
    screen: "linear-gradient(180deg,#3d1526,#7a2846)",
    glow: "rgba(255,158,196,0.28)",
    accent: "#ff9ec4",
    ink: "#fff5f9",
    sub: "#e2b6c8",
    dark: true,
  },
  oceano: {
    screen: "linear-gradient(180deg,#0f2438,#1e3a5f)",
    glow: "rgba(108,197,240,0.25)",
    accent: "#6cc5f0",
    ink: "#f0f7fc",
    sub: "#a9c8dd",
    dark: true,
  },
  "meia-noite": {
    screen: "linear-gradient(180deg,#0a0d15,#1c2130)",
    glow: "rgba(157,180,224,0.22)",
    accent: "#9db4e0",
    ink: "#eef1f8",
    sub: "#8592ab",
    dark: true,
  },
};

function getTheme(id: string) {
  return THEMES[id] || THEMES["branco-rosa"];
}

function useLiveCounter(startDate: string) {
  const [t, setT] = useState<any>({});
  useEffect(() => {
    if (!startDate) return;
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

function toEmbed(url?: string) {
  if (!url) return null;
  try {
    if (url.includes("spotify.com")) {
      const id = url.split("/track/")[1]?.split("?")[0];
      if (id) return { type: "spotify", src: `https://open.spotify.com/embed/track/${id}` };
    }
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const id = url.includes("youtu.be")
        ? url.split("youtu.be/")[1]?.split("?")[0]
        : new URLSearchParams(url.split("?")[1]).get("v");
      if (id) return { type: "youtube", src: `https://www.youtube.com/embed/${id}` };
    }
  } catch {}
  return null;
}

export default function PageContent({ page }: { page: CouplePageDoc }) {
  const th = getTheme(page.theme);
  const t = useLiveCounter(page.startDate);
  const embed = toEmbed(page.music);
  const has = page.startDate && t.total !== undefined;
  const dateLabel = has
    ? new Date(page.startDate + "T00:00:00").toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const cardBg = th.dark ? "rgba(255,255,255,0.08)" : "#fff";
  const line = th.dark ? "rgba(255,255,255,0.16)" : "#fbe1ec";

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (page.photos.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % page.photos.length), 3000);
    return () => clearInterval(id);
  }, [page.photos.length]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: th.screen,
        fontFamily: "'Playfair Display', 'Inter', serif",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 340,
          background: `radial-gradient(70% 60% at 50% 0%, ${th.glow}, transparent)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          maxWidth: 560,
          margin: "0 auto",
          padding: "60px 24px 72px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 40 }}>♥</div>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: th.ink,
            marginTop: 12,
            lineHeight: 1.2,
          }}
        >
          {page.title || "Para você"}
        </h1>

        {has ? (
          <>
            <div style={{ fontSize: 13, color: th.sub, marginTop: 10 }}>
              Juntos desde {dateLabel}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              {[
                [t.y, "ANO"],
                [t.mo, "MESES"],
                [t.da, "DIAS"],
              ].map(([n, l]) => (
                <div
                  key={l as string}
                  style={{
                    minWidth: 64,
                    padding: "12px 8px",
                    borderRadius: 14,
                    background: cardBg,
                    border: `1px solid ${line}`,
                  }}
                >
                  <div style={{ fontSize: 26, fontWeight: 700, color: th.accent }}>
                    {n as number}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: "0.14em", color: th.sub, marginTop: 3 }}>
                    {l}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 12,
                padding: "8px 20px",
                borderRadius: 99,
                background: cardBg,
                border: `1px solid ${line}`,
                fontSize: 15,
                letterSpacing: "0.06em",
                color: th.accent,
              }}
            >
              {pad(t.h)} : {pad(t.mi)} : {pad(t.se)}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: th.sub }}>
              ✨ São <b style={{ color: th.accent }}>{t.total}</b> dias de amor ✨
            </div>
          </>
        ) : null}

        {embed && (
          <div style={{ marginTop: 32, width: "100%", maxWidth: 420 }}>
            <iframe
              title="música"
              src={embed.src}
              width="100%"
              height={embed.type === "spotify" ? 152 : 200}
              frameBorder={0}
              allow="encrypted-media"
              style={{ borderRadius: 12 }}
            />
          </div>
        )}

        {page.photos.length > 0 && (
          <div style={{ marginTop: 32, width: "100%", maxWidth: 380 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4/5",
                borderRadius: 16,
                overflow: "hidden",
                border: `1px solid ${line}`,
              }}
            >
              {page.photos.map((p, i) => (
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

        {page.moments?.length > 0 && (
          <div style={{ marginTop: 36, width: "100%", maxWidth: 420, textAlign: "left" }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: th.ink, textAlign: "center" }}>
              Nossa História
            </div>
            {page.moments.map((m, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: th.accent,
                      marginTop: 6,
                    }}
                  />
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: th.accent, opacity: 0.3 }} />
                  )}
                </div>
                <div style={{ paddingBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: th.accent }}>
                    {m.date &&
                      new Date(m.date + "T00:00:00")
                        .toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
                        .toUpperCase()}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: th.ink }}>{m.title}</div>
                  {m.desc && <div style={{ fontSize: 12.5, color: th.sub, marginTop: 2 }}>{m.desc}</div>}
                  {m.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.photo}
                      alt=""
                      style={{ marginTop: 6, width: "100%", borderRadius: 10, border: `1px solid ${line}` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 36,
            padding: "16px",
            borderRadius: 14,
            background: th.dark ? "rgba(255,255,255,0.06)" : "#fdf2f7",
            border: `1px solid ${line}`,
            width: "100%",
            maxWidth: 420,
            boxSizing: "border-box",
          }}
        >
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: th.ink, fontStyle: "italic" }}>
            "{page.message}"
          </p>
        </div>

        {/* QR Code — pra imprimir e presentear. Personalizado (com foto no
            centro) só se qrPaid === true (confirmado pelo webhook). */}
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${page.slug}`
              )}`}
              alt="QR code da página"
              width={140}
              height={140}
              style={{ borderRadius: 12, border: `1px solid ${line}` }}
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
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "3px solid #fff",
                  objectFit: "cover",
                }}
              />
            )}
          </div>
          <div style={{ fontSize: 11, color: th.sub, marginTop: 8 }}>
            escaneie ou imprima pra presentear
          </div>
        </div>

        <div style={{ marginTop: 40, fontSize: 11, color: th.sub }}>
          feito com ♥ ·{" "}
          <a href="/criar" style={{ color: th.accent, textDecoration: "underline" }}>
            crie sua própria página de amor
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

// components/CouplePageContent.tsx
// Renderização visual da página do casal — usada em TRÊS lugares:
//   1. app/[slug]/page.tsx       — a página final publicada
//   2. app/criar (preview iPhone) — preview ao vivo, compact
//   3. app/criar (modo imersivo)  — tela cheia com "deslize para abrir"
// Aceita objeto parcial, com defaults sensatos (pro preview funcionar vazio).

import { useEffect, useState, useRef, useMemo } from "react";
import { Calendar, Play, Sparkles, Plane, Heart, Coffee, Camera, Gift, Star, Home, Cake, MapPin, Music } from "lucide-react";
import type { CouplePageDoc } from "@/types/page";

export const THEMES: Record<
  string,
  { name: string; vip: boolean; swatch: string; screen: string; glow: string; accent: string; ink: string; sub: string; dark: boolean }
> = {
  "branco-rosa": { name: "Branco e Rosa", vip: false, dark: false, swatch: "linear-gradient(135deg,#fdf2f7,#f7c6dc)", screen: "linear-gradient(180deg,#fdf2f7,#ffffff)", glow: "rgba(236,75,147,0.18)", accent: "#ec4b93", ink: "#2c2333", sub: "#a493ad" },
  rosa: { name: "Rosa", vip: false, dark: true, swatch: "linear-gradient(135deg,#7a2846,#c14d78)", screen: "linear-gradient(180deg,#3d1526,#7a2846)", glow: "rgba(255,158,196,0.28)", accent: "#ff9ec4", ink: "#fff5f9", sub: "#e2b6c8" },
  oceano: { name: "Oceano", vip: false, dark: true, swatch: "linear-gradient(135deg,#1e3a5f,#2f6d9e)", screen: "linear-gradient(180deg,#0f2438,#1e3a5f)", glow: "rgba(108,197,240,0.25)", accent: "#6cc5f0", ink: "#f0f7fc", sub: "#a9c8dd" },
  "por-do-sol": { name: "Pôr do Sol", vip: false, dark: true, swatch: "linear-gradient(135deg,#8a2c52,#e56b45 60%,#f2a65a)", screen: "linear-gradient(180deg,#3a1530,#8a3c52 55%,#d47a52)", glow: "rgba(255,180,120,0.3)", accent: "#ffcf8a", ink: "#fff6ee", sub: "#f0c9b0" },
  floresta: { name: "Floresta", vip: false, dark: true, swatch: "linear-gradient(135deg,#173d2e,#2f7d55)", screen: "linear-gradient(180deg,#0e2820,#1f5a3f)", glow: "rgba(143,224,168,0.25)", accent: "#8fe0a8", ink: "#eef8f1", sub: "#b0d4bf" },
  lavanda: { name: "Lavanda", vip: false, dark: true, swatch: "linear-gradient(135deg,#5b3b8c,#9070c8)", screen: "linear-gradient(180deg,#2e1d4a,#5b3b8c)", glow: "rgba(201,168,240,0.28)", accent: "#c9a8f0", ink: "#f5f0fc", sub: "#c8b8dd" },
  "meia-noite": { name: "Meia-noite", vip: false, dark: true, swatch: "linear-gradient(135deg,#141824,#2a3244)", screen: "linear-gradient(180deg,#0a0d15,#1c2130)", glow: "rgba(157,180,224,0.22)", accent: "#9db4e0", ink: "#eef1f8", sub: "#8592ab" },
  aurora: { name: "Aurora Boreal", vip: true, dark: true, swatch: "linear-gradient(135deg,#0f3b3a,#1f7a6b 55%,#3fae8f)", screen: "linear-gradient(180deg,#0a2b2c,#155f57 60%,#2f8f78)", glow: "rgba(127,234,208,0.28)", accent: "#7fead0", ink: "#eefaf6", sub: "#a8dccb" },
  galaxia: { name: "Galáxia", vip: true, dark: true, swatch: "linear-gradient(135deg,#1a1240,#3d2170 55%,#6a3fa0)", screen: "radial-gradient(120% 80% at 50% 0%,#4a2d82,#2a1a55 55%,#0d0a24)", glow: "rgba(199,155,240,0.3)", accent: "#c79bf0", ink: "#f4eefb", sub: "#b6a4d8" },
  petalas: { name: "Pétalas de Rosa", vip: true, dark: true, swatch: "linear-gradient(135deg,#2a0f1c,#6a2440 55%,#9c3a5e)", screen: "linear-gradient(180deg,#1c0a14,#4a1a30)", glow: "rgba(242,160,192,0.28)", accent: "#f2a0c0", ink: "#fdeef4", sub: "#d8a8bc" },
};

export function getTheme(id?: string) {
  return THEMES[id ?? "branco-rosa"] ?? THEMES["branco-rosa"];
}

export const MOMENT_ICONS = [
  { id: "viagem", label: "Viagem", Icon: Plane },
  { id: "amor", label: "Amor", Icon: Heart },
  { id: "encontro", label: "Encontro", Icon: Coffee },
  { id: "foto", label: "Foto", Icon: Camera },
  { id: "presente", label: "Presente", Icon: Gift },
  { id: "especial", label: "Especial", Icon: Star },
  { id: "casa", label: "Casa", Icon: Home },
  { id: "aniversario", label: "Aniversário", Icon: Cake },
  { id: "lugar", label: "Lugar", Icon: MapPin },
  { id: "musica", label: "Música", Icon: Music },
];
const getMomentIcon = (id?: string) => (MOMENT_ICONS.find((m) => m.id === id) ?? MOMENT_ICONS[1]).Icon;

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
      setT({ y, mo, da, h: Math.floor(rem / 3600000), mi: Math.floor((rem % 3600000) / 60000), se: Math.floor((rem % 60000) / 1000), total: Math.floor(ms / 86400000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startDate]);
  return t;
}

// Mapa estelar — constelação determinística, gerada a partir da data + título
// (cada casal tem "a sua", sempre a mesma, sem ser aleatória a cada render).
export function StarMap({ th, caption, seed = "", size = 180 }: { th: any; caption: string; seed?: string; size?: number }) {
  const stars = useMemo(() => {
    let s = 2166136261;
    for (let i = 0; i < seed.length; i++) s = ((s ^ seed.charCodeAt(i)) * 16777619) >>> 0;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    return Array.from({ length: 70 }, () => ({ x: rnd() * 240, y: rnd() * 240, r: rnd() * 1.2 + 0.3, o: rnd() * 0.6 + 0.35 }));
  }, [seed]);
  const inside = (st: { x: number; y: number }) => Math.hypot(st.x - 120, st.y - 120) < 112;
  const bright = [{ x: 88, y: 82 }, { x: 132, y: 104 }, { x: 158, y: 76 }, { x: 116, y: 150 }];
  const gid = `sky-${(seed || "d").replace(/\W/g, "")}`;
  return (
    <div style={{ marginTop: 22, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox="0 0 240 240" width={size} height={size}>
        <defs>
          <radialGradient id={gid} cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#2a2150" />
            <stop offset="100%" stopColor="#0c0a1c" />
          </radialGradient>
        </defs>
        <circle cx="120" cy="120" r="118" fill={`url(#${gid})`} stroke={th.accent} strokeWidth="1.5" strokeOpacity="0.5" />
        {stars.filter(inside).map((st, i) => (
          <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#fff" opacity={st.o} />
        ))}
        <polyline points={bright.map((b) => `${b.x},${b.y}`).join(" ")} fill="none" stroke={th.accent} strokeWidth="0.8" strokeOpacity="0.55" />
        {bright.map((b, i) => (
          <g key={i}>
            <circle cx={b.x} cy={b.y} r="2.4" fill={th.accent} />
            <circle cx={b.x} cy={b.y} r="5" fill={th.accent} opacity="0.22" />
          </g>
        ))}
      </svg>
      <div style={{ fontSize: 10, color: th.sub, marginTop: 6, fontStyle: "italic" }}>{caption}</div>
    </div>
  );
}

function FloatingHearts({ accent }: { accent: string }) {
  const items = useRef(
    Array.from({ length: 10 }, () => ({ left: Math.random() * 100, delay: Math.random() * 8, dur: 7 + Math.random() * 8, size: 9 + Math.random() * 12, op: 0.08 + Math.random() * 0.16 }))
  ).current;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`@keyframes cpFloat{to{transform:translateY(-115vh) rotate(30deg);opacity:0;}}`}</style>
      {items.map((h, i) => (
        <span key={i} style={{ position: "absolute", left: `${h.left}%`, bottom: "-6%", fontSize: h.size, color: accent, opacity: h.op, animation: `cpFloat ${h.dur}s linear ${h.delay}s infinite` }}>
          ♥
        </span>
      ))}
    </div>
  );
}

type PreviewDoc = Partial<CouplePageDoc> & { slug?: string };

export default function CouplePageContent({ page, compact = false }: { page: PreviewDoc; compact?: boolean }) {
  const th = getTheme(page.theme);
  const t = useLiveCounter(page.startDate);
  const embed = toEmbed(page.music);
  const has = !!page.startDate && t.total !== undefined;
  const dateLabel = has
    ? new Date(page.startDate! + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const pad = (n: number) => String(n ?? 0).padStart(2, "0");
  const cardBg = th.dark ? "rgba(255,255,255,0.08)" : "#fff";
  const line = th.dark ? "rgba(255,255,255,0.16)" : "#fbe1ec";
  const photos = page.photos ?? [];
  const moments = (page.moments ?? []).filter((m) => m.title || m.date);
  const F = compact ? 0.84 : 1;

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % photos.length), 3000);
    return () => clearInterval(id);
  }, [photos.length]);

  return (
    <div style={{ minHeight: compact ? "100%" : "100vh", background: th.screen, fontFamily: "'Playfair Display', Georgia, serif", position: "relative", overflow: "hidden", transition: "background .5s ease" }}>
      <style>{`@keyframes cpBeat{0%,100%{transform:scale(1);}14%{transform:scale(1.14);}28%{transform:scale(1);}42%{transform:scale(1.08);}70%{transform:scale(1);}}`}</style>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: compact ? 200 : 340, background: `radial-gradient(70% 60% at 50% 0%, ${th.glow}, transparent)`, pointerEvents: "none" }} />
      <FloatingHearts accent={th.accent} />

      <div style={{ position: "relative", maxWidth: 560, margin: "0 auto", padding: compact ? "44px 20px 36px" : "60px 24px 72px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Heart size={38 * F} color={th.accent} fill={th.accent} style={{ animation: "cpBeat 1.7s ease-in-out infinite" }} />
        <h1 style={{ fontSize: 26 * F, fontWeight: 600, color: th.ink, marginTop: 12, lineHeight: 1.2 }}>{page.title || "Título da página"}</h1>

        {has ? (
          <>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11 * F, color: th.sub, marginTop: 8 }}>
              <Calendar size={11 * F} color={th.accent} /> Juntos desde {dateLabel}
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
              {[[t.y, "ANO"], [t.mo, "MESES"], [t.da, "DIAS"]].map(([n, l]) => (
                <div key={l as string} style={{ minWidth: 54 * F, padding: "10px 6px", borderRadius: 12, background: cardBg, border: `1px solid ${line}` }}>
                  <div style={{ fontSize: 22 * F, fontWeight: 700, color: th.accent, lineHeight: 1 }}>{n as number}</div>
                  <div style={{ fontSize: 8 * F, letterSpacing: "0.14em", color: th.sub, marginTop: 4 }}>{l as string}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: "6px 16px", borderRadius: 99, background: cardBg, border: `1px solid ${line}`, fontSize: 13 * F, letterSpacing: "0.06em", color: th.accent }}>
              {pad(t.h)} : {pad(t.mi)} : {pad(t.se)}
            </div>
            <div style={{ marginTop: 10, fontSize: 11 * F, color: th.sub, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Sparkles size={10 * F} color={th.accent} /> São <b style={{ color: th.accent }}>{t.total}</b> dias de amor <Sparkles size={10 * F} color={th.accent} />
            </div>
          </>
        ) : (
          <div style={{ marginTop: 16, padding: "12px 20px", borderRadius: 14, background: cardBg, border: `1px solid ${line}` }}>
            <div style={{ fontSize: 24 * F, fontWeight: 700, color: th.accent, lineHeight: 1 }}>0</div>
            <div style={{ fontSize: 8 * F, letterSpacing: "0.14em", color: th.sub, marginTop: 3 }}>DIAS</div>
          </div>
        )}

        {page.astral && (
          <StarMap
            th={th}
            caption={has ? `O céu em ${dateLabel}` : "O céu naquele instante"}
            seed={(page.title ?? "") + (page.startDate ?? "")}
            size={compact ? 140 : 200}
          />
        )}

        {page.music && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", maxWidth: 380, padding: "9px 12px", borderRadius: 12, background: cardBg, border: `1px solid ${line}`, marginTop: 22, boxSizing: "border-box" }}>
            <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: th.accent, display: "grid", placeItems: "center" }}>
              <Play size={12} color={th.dark ? "#1b1b1f" : "#fff"} fill={th.dark ? "#1b1b1f" : "#fff"} />
            </span>
            <span style={{ fontSize: 11 * F, color: th.ink, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {/^https?:/i.test(page.music) ? "Clique para descobrir" : page.music}
            </span>
          </div>
        )}
        {embed && !compact && (
          <div style={{ marginTop: 14, width: "100%", maxWidth: 380 }}>
            <iframe title="música" src={embed.src} width="100%" height={embed.type === "spotify" ? 152 : 180} style={{ borderRadius: 12, border: "none" }} />
          </div>
        )}

        {photos.length > 0 && (
          <div style={{ marginTop: 26, width: "100%", maxWidth: 320 }}>
            <div style={{ fontSize: 15 * F, fontWeight: 600, color: th.ink }}>Nossos Momentos</div>
            <div style={{ fontSize: 9.5 * F, color: th.sub, margin: "2px 0 12px" }}>Memórias que guardamos no coração</div>
            <div style={{ position: "relative", width: "100%", aspectRatio: "4/5", borderRadius: 14, overflow: "hidden", border: `1px solid ${line}` }}>
              {photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: i === slide ? 1 : 0, transition: "opacity .8s ease" }} />
              ))}
              {photos.length > 1 && (
                <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5 }}>
                  {photos.map((_, i) => (
                    <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i === slide ? th.accent : "rgba(255,255,255,0.6)" }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {moments.length > 0 && (
          <div style={{ marginTop: 30, width: "100%", maxWidth: 380 }}>
            <div style={{ fontSize: 15 * F, fontWeight: 600, color: th.ink }}>Nossa História</div>
            <div style={{ fontSize: 9.5 * F, color: th.sub, margin: "2px 0 14px" }}>Momentos que marcaram nossa jornada</div>
            {moments.map((m, i, arr) => {
              const Ic = getMomentIcon(m.icon);
              const dl = m.date
                ? new Date(m.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }).toUpperCase()
                : "";
              return (
                <div key={i} style={{ display: "flex", gap: 10, textAlign: "left" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${th.accent}`, display: "grid", placeItems: "center", background: cardBg }}>
                      <Ic size={12} color={th.accent} />
                    </div>
                    {i < arr.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: th.accent, opacity: 0.35, marginTop: 3 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 16, minWidth: 0 }}>
                    {dl && <div style={{ fontSize: 8.5 * F, fontWeight: 700, letterSpacing: "0.06em", color: th.accent }}>{dl}</div>}
                    <div style={{ fontSize: 14 * F, fontWeight: 600, color: th.ink, marginTop: 1 }}>{m.title || "Momento"}</div>
                    {m.desc && <div style={{ fontSize: 10.5 * F, color: th.sub, marginTop: 2, lineHeight: 1.4 }}>{m.desc}</div>}
                    {m.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photo} alt="" style={{ marginTop: 6, width: "100%", borderRadius: 10, border: `1px solid ${line}`, display: "block" }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 8, width: "100%", maxWidth: 380 }}>
          <span style={{ flex: 1, height: 1, background: line }} />
          <Heart size={12} color={th.accent} fill={th.accent} />
          <span style={{ flex: 1, height: 1, background: line }} />
        </div>

        <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: th.dark ? "rgba(255,255,255,0.06)" : "#fdf2f7", border: `1px solid ${line}`, width: "100%", maxWidth: 380, boxSizing: "border-box" }}>
          <p style={{ margin: 0, fontSize: 13 * F, lineHeight: 1.55, color: page.message ? th.ink : th.sub, fontStyle: "italic" }}>
            {page.message ? `"${page.message}"` : "Sua mensagem de amor aparecerá aqui..."}
          </p>
        </div>

        {page.slug && (
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${page.slug}`)}`}
                alt="QR code da página"
                width={compact ? 90 : 130}
                height={compact ? 90 : 130}
                style={{ borderRadius: 10, border: `1px solid ${line}` }}
              />
              {page.qrPaid && page.qrPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.qrPhoto} alt="" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: compact ? 26 : 36, height: compact ? 26 : 36, borderRadius: "50%", border: "3px solid #fff", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ fontSize: 10 * F, color: th.sub, marginTop: 6 }}>escaneie ou imprima pra presentear</div>
          </div>
        )}

        <div style={{ marginTop: 28, display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600, fontSize: 13 * F, color: th.ink }}>
          <Heart size={11} color={th.accent} fill={th.accent} /> Nosso Amor
        </div>
        <a href="/criar" style={{ fontSize: 9.5 * F, color: th.sub, marginTop: 2, textDecoration: "none" }}>
          Crie sua própria página de amor
        </a>
      </div>
    </div>
  );
}

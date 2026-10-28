"use client";

// components/RetroStories.tsx
// "Retrospectiva do Casal" — o ano do casal contado em slides de tela cheia,
// no formato stories: barrinhas de progresso no topo, toque na direita avança,
// na esquerda volta, segurar pausa. Usado em três lugares (igual a Clássica):
//   1. app/[slug]/page.tsx            — a página final publicada
//   2. app/criar (preview no iPhone)  — compact, ocupa o pai
//   3. app/retrospectiva/exemplo      — demo com dados fictícios (pra vídeos)
//
// Identidade própria de propósito: nada de nome, logo, verde ou fonte de
// nenhuma plataforma de música. A referência é o FORMATO (cores chapadas,
// números gigantes, um card final pra print), que não é de ninguém.
//
// Os tamanhos usam unidades de container (cqw), então o mesmo layout escala
// sozinho do mini preview de 260px até a tela cheia do celular.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Pause, Play, RotateCcw, Share2, Music2, Camera } from "lucide-react";
import type { CouplePageDoc, RetroSong } from "@/types/page";

type Doc = Partial<CouplePageDoc> & { slug?: string };

// ───────── paletas ─────────
// Cada tema é uma sequência de "cartelas" (fundo + texto + destaque). Cada
// slide pega a próxima cartela — é isso que dá a cara de retrospectiva.
type Swatch = { bg: string; fg: string; ac: string; ac2: string };
export const RETRO_THEMES: Record<string, { name: string; preview: string; swatches: Swatch[] }> = {
  "retro-paixao": {
    name: "Paixão",
    preview: "linear-gradient(135deg,#E8336D,#2B0B3F 55%,#FF8A3D)",
    swatches: [
      { bg: "#E8336D", fg: "#FFF4F7", ac: "#2B0B3F", ac2: "#FFD23F" },
      { bg: "#2B0B3F", fg: "#FFE9F0", ac: "#FF5C8A", ac2: "#FFD23F" },
      { bg: "#FF8A3D", fg: "#2B0B3F", ac: "#FFF4F7", ac2: "#E8336D" },
      { bg: "#FFD9E4", fg: "#2B0B3F", ac: "#E8336D", ac2: "#FF8A3D" },
      { bg: "#6A1B4D", fg: "#FFE9F0", ac: "#FFD23F", ac2: "#FF5C8A" },
    ],
  },
  "retro-neon": {
    name: "Neon",
    preview: "linear-gradient(135deg,#0E0B1F,#FF3CAC 55%,#00D4FF)",
    swatches: [
      { bg: "#0E0B1F", fg: "#F5F3FF", ac: "#FF3CAC", ac2: "#00D4FF" },
      { bg: "#FF3CAC", fg: "#0E0B1F", ac: "#FFF15C", ac2: "#0E0B1F" },
      { bg: "#1B1446", fg: "#F5F3FF", ac: "#00D4FF", ac2: "#FF3CAC" },
      { bg: "#FFF15C", fg: "#0E0B1F", ac: "#7B2FF7", ac2: "#FF3CAC" },
      { bg: "#7B2FF7", fg: "#F5F3FF", ac: "#FFF15C", ac2: "#00D4FF" },
    ],
  },
  "retro-por-do-sol": {
    name: "Pôr do Sol",
    preview: "linear-gradient(135deg,#FF6B35,#2E294E 55%,#F7C59F)",
    swatches: [
      { bg: "#FF6B35", fg: "#FFF8F0", ac: "#2E294E", ac2: "#FFE1A8" },
      { bg: "#2E294E", fg: "#FFF8F0", ac: "#FF9F68", ac2: "#F7C59F" },
      { bg: "#F7C59F", fg: "#2E294E", ac: "#D7263D", ac2: "#FF6B35" },
      { bg: "#D7263D", fg: "#FFF8F0", ac: "#FFE1A8", ac2: "#2E294E" },
      { bg: "#FFF1E0", fg: "#2E294E", ac: "#FF6B35", ac2: "#D7263D" },
    ],
  },
};
export const DEFAULT_RETRO_THEME = "retro-paixao";
const getRetroTheme = (id?: string) => RETRO_THEMES[id ?? ""] ?? RETRO_THEMES[DEFAULT_RETRO_THEME];

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Sugestões pro quiz — números "do casal", meio sérios, meio zoeira.
export const RETRO_STAT_IDEAS = [
  { value: "1.247", label: "vezes que eu disse “te amo”" },
  { value: "38", label: "brigas por causa de onde jantar" },
  { value: "212", label: "episódios de série maratonados juntos" },
  { value: "∞", label: "vezes que você roubou meu cobertor" },
  { value: "57", label: "pizzas divididas (você comeu mais)" },
  { value: "4.380", label: "áudios de mais de 1 minuto" },
];

const D_FONT = "'Bricolage Grotesque', 'Inter', system-ui, sans-serif";
const B_FONT = "Inter, system-ui, sans-serif";

function toEmbed(url?: string) {
  if (!url) return null;
  try {
    if (url.includes("spotify.com")) {
      const id = url.split("/track/")[1]?.split("?")[0];
      if (id) return { type: "spotify" as const, src: `https://open.spotify.com/embed/track/${id}?utm_source=generator` };
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

// Dias juntos DENTRO do ano da retrospectiva (o número que mais emociona) e o
// total desde o começo do namoro.
function computeDays(startDate: string | undefined, year: number) {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  if (isNaN(start.getTime())) return null;
  const today = new Date();
  const yStart = new Date(year, 0, 1);
  const yEnd = new Date(year, 11, 31);
  const from = start > yStart ? start : yStart;
  const to = today < yEnd ? today : yEnd;
  const inYear = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000) + 1);
  const total = Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
  return { inYear, total, start };
}

function useCountUp(target: number, active: boolean, ms = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    // cada slide remonta ao entrar (key), então começa do zero sozinho
    if (!active) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, ms]);
  return n;
}

type Slide = { key: string; auto: boolean; ms: number; render: (sw: Swatch, active: boolean) => React.ReactNode };

export default function RetroStories({ page, compact = false }: { page: Doc; compact?: boolean }) {
  const theme = getRetroTheme(page.theme);
  const year = page.retroYear || new Date().getFullYear();
  const nameA = page.retroNameA?.trim() || "Você";
  const nameB = page.retroNameB?.trim() || "Eu";
  const days = computeDays(page.startDate, year);
  const months = useMemo(
    () => [...(page.retroMonths ?? [])].filter((m) => m.title?.trim() || m.photo).sort((a, b) => a.month - b.month),
    [page.retroMonths]
  );
  const songs = (page.retroSongs ?? []).filter((s) => s.title?.trim()).slice(0, 5);
  const stats = (page.retroStats ?? []).filter((s) => s.value?.trim() && s.label?.trim()).slice(0, 4);
  const hasWrapped = !!(page.retroWrappedA || page.retroWrappedB);
  const coverPhoto = months.find((m) => m.photo)?.photo ?? page.photos?.[0];

  // ───────── monta a sequência de slides ─────────
  const slides: Slide[] = [];

  slides.push({
    key: "intro",
    auto: true,
    ms: 5000,
    render: (sw) => (
      <Center>
        <Kicker sw={sw} d={0}>a retrospectiva de</Kicker>
        <div className="rs-in" style={{ ["--d" as string]: "120ms", fontFamily: D_FONT, fontWeight: 800, fontSize: "11cqw", lineHeight: 1.02, marginTop: "3cqw" }}>
          {nameA} <span style={{ color: sw.ac2 }}>&</span> {nameB}
        </div>
        <div className="rs-pop" style={{ ["--d" as string]: "350ms", fontFamily: D_FONT, fontWeight: 800, fontSize: "38cqw", lineHeight: 0.9, letterSpacing: "-0.04em", color: sw.ac, marginTop: "5cqw" }}>
          {year}
        </div>
        <div className="rs-in" style={{ ["--d" as string]: "700ms", fontSize: "4.2cqw", opacity: 0.85, marginTop: "6cqw", maxWidth: "75cqw" }}>
          Vem ver como foi o nosso ano ♥
        </div>
      </Center>
    ),
  });

  if (days) {
    slides.push({
      key: "dias",
      auto: true,
      ms: 6500,
      render: (sw, active) => <DaysSlide sw={sw} active={active} days={days} year={year} />,
    });
  }

  months.forEach((m, i) => {
    slides.push({
      key: `mes-${m.month}-${i}`,
      auto: true,
      ms: 5500,
      render: (sw) => <MonthSlide sw={sw} month={m.month} title={m.title} photo={m.photo} index={i} total={months.length} />,
    });
  });

  if (songs.length) {
    slides.push({ key: "musicas", auto: false, ms: 0, render: (sw, active) => <SongsSlide sw={sw} songs={songs} active={active} /> });
  }

  if (hasWrapped) {
    slides.push({
      key: "wrapped",
      auto: true,
      ms: 7000,
      render: (sw) => (
        <Center>
          <Kicker sw={sw} d={0}>o que cada um ouviu</Kicker>
          <Title d={120}>A trilha de cada um</Title>
          <div style={{ display: "flex", gap: "4cqw", marginTop: "7cqw", width: "100%", justifyContent: "center" }}>
            {[
              { src: page.retroWrappedA, n: nameA, r: -4 },
              { src: page.retroWrappedB, n: nameB, r: 4 },
            ]
              .filter((x) => x.src)
              .map((x, i) => (
                <div key={i} className="rs-pop" style={{ ["--d" as string]: `${300 + i * 200}ms`, width: "40cqw", transform: `rotate(${x.r}deg)` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={x.src} alt="" style={{ width: "100%", aspectRatio: "9/16", objectFit: "cover", borderRadius: "4cqw", border: `1cqw solid ${sw.fg}`, display: "block", boxShadow: "0 3cqw 8cqw rgba(0,0,0,.35)" }} />
                  <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "5cqw", marginTop: "3cqw" }}>{x.n}</div>
                </div>
              ))}
          </div>
        </Center>
      ),
    });
  }

  if (stats.length) {
    slides.push({
      key: "numeros",
      auto: true,
      ms: 4000 + stats.length * 1500,
      render: (sw) => (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "16cqw 8cqw 10cqw" }}>
          <Kicker sw={sw} d={0}>em números</Kicker>
          <Title d={120} left>
            O nosso ano
            <br />
            em números
          </Title>
          <div style={{ marginTop: "6cqw", display: "grid", gap: "3.5cqw" }}>
            {stats.map((s, i) => (
              <div key={i} className="rs-in" style={{ ["--d" as string]: `${500 + i * 900}ms`, borderTop: `0.5cqw solid ${sw.fg}33`, paddingTop: "3.5cqw" }}>
                <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "13cqw", lineHeight: 0.95, color: [sw.ac, sw.ac2][i % 2] }}>{s.value}</div>
                <div style={{ fontSize: "4.4cqw", lineHeight: 1.3, fontWeight: 500, marginTop: "1cqw" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    });
  }

  const message = page.message?.trim() ?? "";
  if (message) {
    slides.push({
      key: "mensagem",
      auto: true,
      ms: Math.min(16000, 6000 + message.length * 45),
      render: (sw) => (
        <Center>
          <Heart className="rs-pop" style={{ ["--d" as string]: "0ms" } as React.CSSProperties} size={48} color={sw.ac} fill={sw.ac} />
          <Kicker sw={sw} d={150}>
            de {nameB} pra {nameA}
          </Kicker>
          <div className="rs-in" style={{ ["--d" as string]: "350ms", fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: message.length > 260 ? "5cqw" : "6.2cqw", lineHeight: 1.45, marginTop: "6cqw", maxWidth: "82cqw" }}>
            “{message}”
          </div>
        </Center>
      ),
    });
  }

  slides.push({
    key: "resumo",
    auto: false,
    ms: 0,
    render: (sw) => (
      <SummarySlide sw={sw} theme={theme} year={year} nameA={nameA} nameB={nameB} days={days} songs={songs} stats={stats} cover={coverPhoto} slug={page.slug} compact={compact} />
    ),
  });

  slides.push({
    key: "fim",
    auto: false,
    ms: 0,
    render: (sw) => (
      <Center>
        <Kicker sw={sw} d={0}>e o melhor ainda vem aí</Kicker>
        <div className="rs-pop" style={{ ["--d" as string]: "150ms", fontFamily: D_FONT, fontWeight: 800, fontSize: "17cqw", lineHeight: 0.95, marginTop: "4cqw" }}>
          Que venha
          <br />
          <span style={{ color: sw.ac }}>{year + 1}</span>
        </div>
        <div className="rs-in" style={{ ["--d" as string]: "450ms", fontSize: "4.4cqw", opacity: 0.85, marginTop: "5cqw" }}>
          com você, de novo. ♥
        </div>
        {page.slug && (
          <div className="rs-in" style={{ ["--d" as string]: "700ms", marginTop: "8cqw", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", background: "#fff", padding: "2cqw", borderRadius: "3cqw" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${page.slug}`)}`}
                alt="QR code da retrospectiva"
                style={{ width: "28cqw", height: "28cqw", display: "block" }}
              />
              {page.qrPaid && page.qrPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.qrPhoto} alt="" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "8cqw", height: "8cqw", borderRadius: "50%", border: "0.8cqw solid #fff", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ fontSize: "3.2cqw", opacity: 0.75, marginTop: "2.5cqw" }}>escaneie pra ver de novo</div>
          </div>
        )}
        <Link
          href="/criar?estilo=retro"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="rs-in"
          style={{ ["--d" as string]: "900ms", marginTop: "8cqw", fontSize: "3.6cqw", fontWeight: 600, color: sw.fg, opacity: 0.85, textDecoration: "underline", textUnderlineOffset: "1cqw" }}
        >
          Crie a retrospectiva de vocês
        </Link>
      </Center>
    ),
  });

  return <StoriesPlayer slides={slides} theme={theme} compact={compact} title={`${nameA} & ${nameB}`} year={year} />;
}

// ───────── player (barrinhas, toque, pausa) ─────────
function StoriesPlayer({ slides, theme, compact, title, year }: { slides: Slide[]; theme: { swatches: Swatch[] }; compact: boolean; title: string; year: number }) {
  const [started, setStarted] = useState(compact);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const n = slides.length;
  // o preview do quiz muda o conteúdo o tempo todo — se a lista encolher,
  // o índice é "grampeado" aqui em vez de apontar pra um slide que sumiu
  const i = Math.min(idx, n - 1);
  const slide = slides[i];
  const sw = theme.swatches[i % theme.swatches.length];

  const go = useCallback((d: number) => setIdx((x) => Math.max(0, Math.min(n - 1, Math.min(x, n - 1) + d))), [n]);

  useEffect(() => {
    if (compact) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, compact]);

  const onDown = () => {
    held.current = false;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setPaused(true);
    }, 220);
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (held.current) {
      setPaused(false);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    go(e.clientX - r.left < r.width * 0.3 ? -1 : 1);
  };

  const shell: React.CSSProperties = compact
    ? { position: "absolute", inset: 0 }
    : { position: "fixed", inset: 0, background: "#0b0710", display: "flex", justifyContent: "center" };

  return (
    <div style={shell}>
      <style>{CSS}</style>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: compact ? "none" : 480,
          height: "100%",
          overflow: "hidden",
          containerType: "size",
          background: sw.bg,
          color: sw.fg,
          fontFamily: B_FONT,
          transition: "background .6s ease, color .6s ease",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "manipulation",
        }}
      >
        <Blobs sw={sw} seed={i} />

        {/* barrinhas */}
        <div style={{ position: "absolute", top: compact ? "11cqw" : "3.5cqw", left: "3.5cqw", right: "3.5cqw", display: "flex", gap: "1.2cqw", zIndex: 5 }}>
          {slides.map((s, j) => (
            <div key={s.key} style={{ flex: 1, height: "0.9cqw", minHeight: 3, borderRadius: 99, background: `${sw.fg}40`, overflow: "hidden" }}>
              <div
                key={j === i ? `run-${i}-${started}` : undefined}
                onAnimationEnd={() => j === i && slide.auto && go(1)}
                style={{
                  height: "100%",
                  borderRadius: 99,
                  background: sw.fg,
                  width: j < i ? "100%" : j > i ? "0%" : slide.auto ? undefined : "100%",
                  animation: j === i && slide.auto && started ? `rsBar ${slide.ms}ms linear forwards` : undefined,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            </div>
          ))}
        </div>

        {/* cabeçalho */}
        <div style={{ position: "absolute", top: compact ? "14.5cqw" : "7cqw", left: "4cqw", right: "4cqw", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 5, fontSize: "3.2cqw", fontWeight: 600 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "1.5cqw", opacity: 0.9 }}>
            <Heart size={12} fill={sw.fg} color={sw.fg} /> Nosso {year}
          </span>
          <button
            aria-label={paused ? "Continuar" : "Pausar"}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={() => setPaused((p) => !p)}
            style={{ background: "none", border: "none", color: sw.fg, cursor: "pointer", padding: "1cqw", display: "grid", placeItems: "center", opacity: 0.85 }}
          >
            {paused ? <Play size={15} fill={sw.fg} /> : <Pause size={15} fill={sw.fg} />}
          </button>
        </div>

        {/* área de toque + slide atual */}
        <div onPointerDown={onDown} onPointerUp={onUp} onContextMenu={(e) => e.preventDefault()} style={{ position: "absolute", inset: 0, zIndex: 2, cursor: "pointer" }}>
          <div key={slide.key} style={{ position: "absolute", inset: 0 }}>
            {slide.render(sw, started)}
          </div>
        </div>

        {!slide.auto && i < n - 1 && (
          <div style={{ position: "absolute", bottom: "5cqw", left: 0, right: 0, textAlign: "center", fontSize: "3.2cqw", opacity: 0.7, zIndex: 3, pointerEvents: "none", animation: "rsNudge 1.6s ease-in-out infinite" }}>
            toque para continuar →
          </div>
        )}
        {i === n - 1 && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={() => setIdx(0)}
            style={{ position: "absolute", bottom: "5cqw", left: "50%", transform: "translateX(-50%)", zIndex: 6, display: "inline-flex", alignItems: "center", gap: "1.8cqw", padding: "2.4cqw 5cqw", borderRadius: 99, border: `0.4cqw solid ${sw.fg}66`, background: "transparent", color: sw.fg, fontSize: "3.4cqw", fontWeight: 600, cursor: "pointer", fontFamily: B_FONT }}
          >
            <RotateCcw size={13} /> Ver de novo
          </button>
        )}

        {/* capa — "toque para abrir" (só fora do preview do quiz) */}
        {!started && (
          <button
            onClick={() => setStarted(true)}
            style={{ position: "absolute", inset: 0, zIndex: 20, border: "none", cursor: "pointer", background: theme.swatches[1].bg, color: theme.swatches[1].fg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4cqw", fontFamily: B_FONT, padding: "10cqw" }}
          >
            <Blobs sw={theme.swatches[1]} seed={7} />
            <div style={{ position: "relative", fontSize: "3.6cqw", letterSpacing: "0.3em", fontWeight: 700, opacity: 0.8 }}>PRA VOCÊ</div>
            <div style={{ position: "relative", fontFamily: D_FONT, fontWeight: 800, fontSize: "12cqw", lineHeight: 1 }}>
              Nosso
              <br />
              <span style={{ color: theme.swatches[1].ac, fontSize: "26cqw" }}>{year}</span>
            </div>
            <div style={{ position: "relative", fontSize: "4cqw", opacity: 0.8 }}>{title}</div>
            <div style={{ position: "relative", marginTop: "8cqw", display: "inline-flex", alignItems: "center", gap: "2cqw", padding: "3.6cqw 7cqw", borderRadius: 99, background: theme.swatches[1].ac, color: theme.swatches[1].bg, fontWeight: 800, fontSize: "4.4cqw", animation: "rsPulse 1.8s ease-in-out infinite" }}>
              <Play size={16} fill="currentColor" /> Toque para abrir
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// ───────── slides ─────────
function DaysSlide({ sw, active, days, year }: { sw: Swatch; active: boolean; days: NonNullable<ReturnType<typeof computeDays>>; year: number }) {
  const n = useCountUp(days.inYear, active);
  const startedThisYear = days.start.getFullYear() === year;
  const since = days.start.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <Center>
      <Kicker sw={sw} d={0}>
        {startedThisYear ? `desde ${since}` : `em ${year}`}, foram
      </Kicker>
      <div className="rs-pop" style={{ ["--d" as string]: "150ms", fontFamily: D_FONT, fontWeight: 800, fontSize: n > 999 ? "34cqw" : "44cqw", lineHeight: 0.9, letterSpacing: "-0.05em", color: sw.ac, marginTop: "4cqw" }}>
        {n}
      </div>
      <Title d={300}>dias juntos</Title>
      <div className="rs-in" style={{ ["--d" as string]: "1700ms", fontSize: "4.2cqw", marginTop: "7cqw", opacity: 0.9, maxWidth: "78cqw", lineHeight: 1.45 }}>
        {startedThisYear ? (
          <>E foi o melhor jeito de começar uma história.</>
        ) : (
          <>
            Ao todo já são <b style={{ color: sw.ac2 }}>{days.total.toLocaleString("pt-BR")} dias</b> desde {since}.
          </>
        )}
      </div>
    </Center>
  );
}

function MonthSlide({ sw, month, title, photo, index, total }: { sw: Swatch; month: number; title: string; photo?: string; index: number; total: number }) {
  const nome = MESES[month] ?? "";
  if (photo) {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="rs-zoom" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 45%,rgba(0,0,0,.8) 100%)" }} />
        <div style={{ position: "absolute", top: "22cqw", left: "7cqw", right: "7cqw", color: "#fff" }}>
          <div className="rs-in" style={{ ["--d" as string]: "0ms", fontSize: "3.4cqw", fontWeight: 700, letterSpacing: "0.25em", opacity: 0.9 }}>
            MOMENTO {index + 1} DE {total}
          </div>
          <div className="rs-in" style={{ ["--d" as string]: "120ms", fontFamily: D_FONT, fontWeight: 800, fontSize: "15cqw", lineHeight: 0.95, marginTop: "2cqw" }}>
            {nome}
          </div>
        </div>
        {title && (
          <div className="rs-in" style={{ ["--d" as string]: "400ms", position: "absolute", left: "7cqw", right: "7cqw", bottom: "14cqw", color: "#fff" }}>
            <span style={{ display: "inline-block", background: sw.ac, color: sw.bg, fontFamily: D_FONT, fontWeight: 800, fontSize: "6.2cqw", lineHeight: 1.25, padding: "1.5cqw 3.5cqw", borderRadius: "2.5cqw", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
              {title}
            </span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8cqw" }}>
      <div className="rs-in" style={{ ["--d" as string]: "0ms", fontSize: "3.4cqw", fontWeight: 700, letterSpacing: "0.25em", opacity: 0.8 }}>
        MOMENTO {index + 1} DE {total}
      </div>
      <div className="rs-pop" style={{ ["--d" as string]: "100ms", fontFamily: D_FONT, fontWeight: 800, fontSize: `${Math.min(22, 140 / Math.max(nome.length, 1))}cqw`, lineHeight: 0.88, letterSpacing: "-0.03em", color: sw.ac, marginTop: "3cqw", whiteSpace: "nowrap" }}>
        {nome}
      </div>
      <div className="rs-in" style={{ ["--d" as string]: "400ms", fontFamily: D_FONT, fontWeight: 600, fontSize: "8cqw", lineHeight: 1.15, marginTop: "6cqw" }}>
        {title}
      </div>
    </div>
  );
}

function SongsSlide({ sw, songs, active }: { sw: Swatch; songs: RetroSong[]; active: boolean }) {
  const [sel, setSel] = useState(() => Math.max(0, songs.findIndex((s) => toEmbed(s.url))));
  const embed = toEmbed(songs[sel]?.url);
  const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation(), onPointerUp: (e: React.PointerEvent) => e.stopPropagation() };
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "16cqw 7cqw 14cqw" }}>
      <Kicker sw={sw} d={0}>a trilha sonora do casal</Kicker>
      <Title d={120} left>
        As nossas
        <br />
        músicas
      </Title>
      <div style={{ marginTop: "5cqw", display: "grid", gap: "2.4cqw" }}>
        {songs.map((s, i) => {
          const [nome, artista] = s.title.split(/\s+-\s+/);
          const playable = !!toEmbed(s.url);
          const on = i === sel && playable;
          return (
            <button
              key={i}
              // só "segura" o toque se a música tiver player; senão o toque
              // passa direto e avança o slide, como em qualquer outro lugar
              {...(playable ? stop : {})}
              onClick={() => playable && setSel(i)}
              className="rs-in"
              style={{ ["--d" as string]: `${300 + i * 160}ms`, display: "flex", alignItems: "center", gap: "3.5cqw", textAlign: "left", padding: "2.6cqw 3cqw", borderRadius: "3cqw", border: "none", cursor: playable ? "pointer" : "default", background: on ? `${sw.fg}22` : "transparent", color: sw.fg, fontFamily: B_FONT }}
            >
              <span style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "8cqw", width: "8cqw", color: i === 0 ? sw.ac : sw.fg, opacity: i === 0 ? 1 : 0.7 }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "4.4cqw", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</div>
                {artista && <div style={{ fontSize: "3.4cqw", opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artista}</div>}
              </span>
              {playable && <Music2 size={16} style={{ opacity: on ? 1 : 0.55, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
      {embed && active && (
        <div {...stop} className="rs-in" style={{ ["--d" as string]: "900ms", marginTop: "4cqw" }}>
          <iframe
            key={embed.src}
            title="música do casal"
            src={embed.src}
            width="100%"
            height={embed.type === "spotify" ? 80 : 160}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            style={{ border: "none", borderRadius: 12, display: "block" }}
          />
        </div>
      )}
    </div>
  );
}

function SummarySlide({
  sw, theme, year, nameA, nameB, days, songs, stats, cover, slug, compact,
}: {
  sw: Swatch; theme: { swatches: Swatch[] }; year: number; nameA: string; nameB: string;
  days: ReturnType<typeof computeDays>; songs: RetroSong[]; stats: { value: string; label: string }[];
  cover?: string; slug?: string; compact: boolean;
}) {
  const card = theme.swatches[0];
  const [copied, setCopied] = useState(false);
  const share = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "")}/${slug ?? ""}`;
    try {
      if (navigator.share) await navigator.share({ title: `Nosso ${year}`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {}
  };
  const cells = [
    days && { k: "DIAS JUNTOS", v: days.inYear.toLocaleString("pt-BR") },
    ...stats.slice(0, days ? 1 : 2).map((s) => ({ k: s.label.toUpperCase(), v: s.value })),
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "15cqw 8cqw 16cqw" }}>
      <div
        className="rs-pop"
        style={{ ["--d" as string]: "0ms", width: "100%", borderRadius: "5cqw", overflow: "hidden", background: card.bg, color: card.fg, boxShadow: "0 4cqw 12cqw rgba(0,0,0,.35)", border: `0.6cqw solid ${sw.fg}26` }}
      >
        <div style={{ display: "flex", gap: "4cqw", padding: "5cqw 5cqw 4cqw", alignItems: "center" }}>
          <div style={{ width: "25cqw", height: "25cqw", borderRadius: "3.5cqw", overflow: "hidden", flexShrink: 0, background: card.ac, display: "grid", placeItems: "center" }}>
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Heart size={34} color={card.bg} fill={card.bg} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "3cqw", fontWeight: 700, letterSpacing: "0.22em", opacity: 0.8 }}>NOSSO</div>
            <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "15cqw", lineHeight: 0.85, color: card.ac2 }}>{year}</div>
            <div style={{ fontFamily: D_FONT, fontWeight: 700, fontSize: "4.6cqw", marginTop: "1.5cqw", lineHeight: 1.1 }}>
              {nameA} & {nameB}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: songs.length ? "1fr 1fr" : "1fr", gap: "4cqw", padding: "0 5cqw 5cqw" }}>
          {songs.length > 0 && (
            <div>
              <div style={{ fontSize: "2.8cqw", fontWeight: 700, letterSpacing: "0.12em", opacity: 0.75, marginBottom: "1.5cqw" }}>NOSSAS MÚSICAS</div>
              {songs.slice(0, 5).map((s, i) => (
                <div key={i} style={{ fontSize: "3.4cqw", fontWeight: 600, lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ opacity: 0.6, marginRight: "1.5cqw" }}>{i + 1}</span>
                  {s.title.split(/\s+-\s+/)[0]}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gap: "3cqw", alignContent: "start" }}>
            {cells.map((c, i) => (
              <div key={i}>
                <div style={{ fontSize: "2.8cqw", fontWeight: 700, letterSpacing: "0.12em", opacity: 0.75, lineHeight: 1.25 }}>{c.k}</div>
                <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "8cqw", lineHeight: 1, marginTop: "0.8cqw" }}>{c.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3cqw 5cqw", background: `${card.fg}14`, fontSize: "3cqw", fontWeight: 700 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "1.5cqw" }}>
            <Heart size={11} fill={card.fg} color={card.fg} /> FromMyHeart
          </span>
          <span style={{ opacity: 0.75 }}>retrospectiva do casal</span>
        </div>
      </div>

      <div className="rs-in" style={{ ["--d" as string]: "400ms", display: "flex", alignItems: "center", gap: "2cqw", marginTop: "5cqw", fontSize: "3.6cqw", fontWeight: 600 }}>
        <Camera size={15} /> Tira um print e posta no story
      </div>
      {slug && !compact && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={share}
          className="rs-in"
          style={{ ["--d" as string]: "550ms", marginTop: "3cqw", display: "inline-flex", alignItems: "center", gap: "2cqw", padding: "2.6cqw 5cqw", borderRadius: 99, border: "none", background: sw.fg, color: sw.bg, fontWeight: 700, fontSize: "3.6cqw", cursor: "pointer", fontFamily: B_FONT }}
        >
          <Share2 size={14} /> {copied ? "Link copiado!" : "Compartilhar"}
        </button>
      )}
    </div>
  );
}

// ───────── peças de UI ─────────
function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "16cqw 7cqw 14cqw" }}>
      {children}
    </div>
  );
}
function Kicker({ children, sw, d }: { children: React.ReactNode; sw: Swatch; d: number }) {
  return (
    <div className="rs-in" style={{ ["--d" as string]: `${d}ms`, fontSize: "3.5cqw", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: sw.fg, opacity: 0.85 }}>
      {children}
    </div>
  );
}
function Title({ children, d, left }: { children: React.ReactNode; d: number; left?: boolean }) {
  return (
    <div className="rs-in" style={{ ["--d" as string]: `${d}ms`, fontFamily: D_FONT, fontWeight: 800, fontSize: "11cqw", lineHeight: 1, letterSpacing: "-0.02em", marginTop: "2.5cqw", textAlign: left ? "left" : "center" }}>
      {children}
    </div>
  );
}

// formas grandes e borradas no fundo — dão movimento sem distrair
function Blobs({ sw, seed }: { sw: Swatch; seed: number }) {
  const pos = [
    [{ t: -18, l: -25, s: 85 }, { t: 70, l: 55, s: 75 }],
    [{ t: 60, l: -30, s: 80 }, { t: -20, l: 50, s: 70 }],
    [{ t: -10, l: 45, s: 90 }, { t: 75, l: -20, s: 65 }],
  ][seed % 3];
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pos.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${p.t}%`,
            left: `${p.l}%`,
            width: `${p.s}cqw`,
            height: `${p.s}cqw`,
            borderRadius: "50%",
            background: i ? sw.ac2 : sw.ac,
            opacity: 0.28,
            filter: "blur(10cqw)",
            animation: `rsFloat ${9 + i * 3}s ease-in-out ${i * -2}s infinite alternate`,
            transition: "background .6s ease",
          }}
        />
      ))}
    </div>
  );
}

const CSS = `
@keyframes rsBar { from { width: 0% } to { width: 100% } }
@keyframes rsIn { from { opacity: 0; transform: translateY(5cqw) } to { opacity: 1; transform: none } }
@keyframes rsPop { 0% { opacity: 0; transform: scale(.6) } 70% { opacity: 1; transform: scale(1.04) } 100% { opacity: 1; transform: scale(1) } }
@keyframes rsZoom { from { transform: scale(1.12) } to { transform: scale(1) } }
@keyframes rsFloat { from { transform: translate(0,0) scale(1) } to { transform: translate(8cqw,6cqw) scale(1.15) } }
@keyframes rsNudge { 0%,100% { transform: translateX(0) } 50% { transform: translateX(1.5cqw) } }
@keyframes rsPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
.rs-in { opacity: 0; animation: rsIn .7s cubic-bezier(.2,.8,.2,1) var(--d, 0ms) both; }
.rs-pop { opacity: 0; animation: rsPop .8s cubic-bezier(.2,.8,.2,1) var(--d, 0ms) both; }
.rs-zoom { animation: rsZoom 6s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .rs-in, .rs-pop, .rs-zoom { animation-duration: .01ms !important; animation-delay: 0ms !important; }
}
`;

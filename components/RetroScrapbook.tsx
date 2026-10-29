"use client";

// components/RetroScrapbook.tsx
// Retrospectiva do Casal no estilo COLAGEM (scrapbook) — papel, fita adesiva,
// polaroids e caneta. Duas variações, pra testar em anúncio:
//
//   "scrap-kraft" → Kraft Polaroid: papel pardo, polaroid grande com legenda
//                   à mão, polaroids nos cantos e tiras de papel rasgado.
//   "scrap-sol"   → Colagem Sol: papel creme + papel amarelo rasgado, nomes em
//                   letras recortadas, o ano com as fotos DENTRO dos números e
//                   adesivos — cores alegres (mostarda, tomate, petróleo) que
//                   servem pra qualquer casal.
//   ("scrap-rosa" e "scrap-creme" eram versões antigas — hoje caem no Sol.)
//
// É uma página de rolagem (igual à Clássica): capa "toque para abrir" →
// abertura → contador → linha do tempo → mixtape (top 5) → recibo do ano
// (números) → promessas → carta → final com QR. A música nº 1 começa a tocar
// no toque da capa (ver MusicDock).
//
// Tamanhos em cqw (unidade do container) pra escalar do preview do quiz até a
// tela cheia do celular.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CouplePageDoc, RetroSong, RetroStat } from "@/types/page";
import MusicDock, { type MusicApi } from "@/components/MusicDock";

type Doc = Partial<CouplePageDoc> & { slug?: string };
export type ScrapVariant = "sol" | "kraft";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const HAND = "'Caveat', 'Segoe Print', cursive";
const TYPE = "'Special Elite', 'Courier New', monospace";
const SERIF = "'Abril Fatface', 'Playfair Display', Georgia, serif";
const BOLD = "'Bricolage Grotesque', 'Inter', system-ui, sans-serif";
const BODY = "Inter, system-ui, sans-serif";

// granulado de papel (SVG inline, sem baixar imagem)
const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 .13 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;

const LOOK = {
  sol: {
    paper: "#FBF4E6",
    paper2: "#F6C453",
    paper2Dark: "#EDB23C",
    ink: "#2B2420",
    soft: "#6B5B4E",
    accent: "#E4572E",
    tape: "rgba(160, 214, 205, .85)",
    tape2: "rgba(250, 226, 160, .9)",
    heart: "#E4572E",
    heart2: "#2A8C82",
    heart3: "#F6C453",
  },
  kraft: {
    paper: "#C9A378",
    paper2: "#BE9568",
    paper2Dark: "#A97F55",
    ink: "#33241A",
    soft: "#5E4634",
    accent: "#B8473B",
    tape: "rgba(242, 232, 206, .82)",
    tape2: "rgba(236, 208, 196, .82)",
    heart: "#C9504A",
    heart2: "#6F8F7A",
    heart3: "#E9C46A",
  },
};
type Look = (typeof LOOK)["kraft"];

// números "aleatórios" mas sempre iguais pro mesmo casal (nada pula a cada render)
function rng(seed: string) {
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) s = ((s ^ seed.charCodeAt(i)) * 16777619) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

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

function useLiveCounter(startDate?: string) {
  const [t, setT] = useState<{ y: number; mo: number; da: number; h: number; mi: number; se: number } | null>(null);
  useEffect(() => {
    if (!startDate) return;
    const start = new Date(startDate + "T00:00:00");
    if (isNaN(start.getTime())) return;
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
      const rem = (now.getTime() - start.getTime()) % 86400000;
      setT({ y, mo, da, h: Math.floor(rem / 3600000), mi: Math.floor((rem % 3600000) / 60000), se: Math.floor((rem % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startDate]);
  return startDate ? t : null;
}

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(() => typeof window !== "undefined" && typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return [ref, inView] as const;
}

function useCountUp(target: number, active: boolean, ms = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
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

// ═════════════════════════════════════════════════════════════════════════
export default function RetroScrapbook({ page, variant, compact = false }: { page: Doc; variant: ScrapVariant; compact?: boolean }) {
  const L = LOOK[variant];
  const year = page.retroYear || new Date().getFullYear();
  const nameA = page.retroNameA?.trim() || "você";
  const nameB = page.retroNameB?.trim() || "eu";
  const days = computeDays(page.startDate, year);
  const months = useMemo(
    () => [...(page.retroMonths ?? [])].filter((m) => m.title?.trim() || m.photo).sort((a, b) => a.month - b.month),
    [page.retroMonths]
  );
  const photos = useMemo(() => [...months.map((m) => m.photo).filter(Boolean), ...(page.photos ?? [])] as string[], [months, page.photos]);
  const songs = (page.retroSongs ?? []).filter((s) => s.title?.trim()).slice(0, 5);
  const stats = (page.retroStats ?? []).filter((s) => s.value?.trim() && s.label?.trim()).slice(0, 5);
  const promises = (page.retroPromises ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 5);
  const message = page.message?.trim() ?? "";
  const [opened, setOpened] = useState(compact);
  const music = useRef<MusicApi | null>(null);

  const open = () => {
    // precisa ser AQUI, dentro do toque, pro navegador deixar tocar som
    music.current?.play();
    setOpened(true);
  };

  const paperBg = (color: string): React.CSSProperties => ({ backgroundColor: color, backgroundImage: NOISE });

  return (
    <div style={{ minHeight: compact ? "100%" : "100vh", ...paperBg(L.paper2Dark), fontFamily: BODY, color: L.ink, overflowX: "hidden", ...(opened ? {} : { height: "100vh", overflow: "hidden" }) }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: compact ? "none" : 520, margin: "0 auto", containerType: "inline-size", position: "relative", boxShadow: compact ? "none" : "0 0 40px rgba(0,0,0,.25)" }}>
        {variant === "sol" ? (
          <HeroSol L={L} year={year} nameA={nameA} nameB={nameB} photos={photos} opened={opened} compact={compact} />
        ) : (
          <HeroKraft L={L} year={year} nameA={nameA} nameB={nameB} photos={photos} opened={opened} compact={compact} />
        )}

        {days && (
          <Sheet L={L} bg={variant === "sol" ? L.paper2 : L.paper} edge stickers={variant === "sol" ? "s1" : undefined}>
            <Counter L={L} days={days} year={year} startDate={page.startDate!} variant={variant} />
          </Sheet>
        )}

        {months.length > 0 && (
          <Sheet L={L} bg={variant === "sol" ? L.paper : L.paper2} edge stickers={variant === "sol" ? "s2" : undefined}>
            <Timeline L={L} months={months} year={year} variant={variant} />
          </Sheet>
        )}

        {songs.length > 0 && (
          <Sheet L={L} bg={variant === "sol" ? L.paper2 : L.paper} edge stickers={variant === "sol" ? "s3" : undefined}>
            <Mixtape L={L} songs={songs} year={year} nameA={nameA} nameB={nameB} />
          </Sheet>
        )}

        {stats.length > 0 && (
          <Sheet L={L} bg={variant === "sol" ? L.paper : L.paper2} edge stickers={variant === "sol" ? "s4" : undefined}>
            <Receipt L={L} stats={stats} year={year} nameA={nameA} nameB={nameB} />
          </Sheet>
        )}

        {promises.length > 0 && (
          <Sheet L={L} bg={variant === "sol" ? L.paper2 : L.paper} edge stickers={variant === "sol" ? "s5" : undefined}>
            <Promises L={L} promises={promises} year={year} />
          </Sheet>
        )}

        {message && (
          <Sheet L={L} bg={variant === "sol" ? L.paper : L.paper2} edge stickers={variant === "sol" ? "s6" : undefined}>
            <Letter L={L} message={message} nameA={nameA} nameB={nameB} />
          </Sheet>
        )}

        <Sheet L={L} bg={variant === "sol" ? L.paper2 : L.paper} edge stickers={variant === "sol" ? "s7" : undefined}>
          <Final L={L} year={year} slug={page.slug} photo={photos[0]} qrPhoto={page.qrPaid ? page.qrPhoto : undefined} />
        </Sheet>
        {!compact && songs[0] && <div style={{ height: 140 }} />}
      </div>

      {!compact && (
        <MusicDock
          url={songs[0]?.url}
          title={songs[0]?.title ?? ""}
          apiRef={music}
          look={{ bg: "#FFFDF7", fg: L.ink, ac: L.accent, font: HAND, radius: 6 }}
        />
      )}

      {!compact && <Cover L={L} variant={variant} year={year} nameA={nameA} nameB={nameB} opened={opened} onOpen={open} photo={photos[0]} />}
    </div>
  );
}

// ───────── capa ─────────
function Cover({ L, variant, year, nameA, nameB, opened, onOpen, photo }: { L: Look; variant: ScrapVariant; year: number; nameA: string; nameB: string; opened: boolean; onOpen: () => void; photo?: string }) {
  return (
    <button
      onClick={onOpen}
      aria-hidden={opened}
      tabIndex={opened ? -1 : 0}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        border: "none",
        cursor: "pointer",
        backgroundColor: variant === "sol" ? L.paper2 : L.paper,
        backgroundImage: NOISE,
        color: L.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        transform: opened ? "translateY(-105%)" : "none",
        transition: "transform 1s cubic-bezier(.7,0,.25,1)",
        pointerEvents: opened ? "none" : "auto",
        overflow: "hidden",
        fontFamily: BODY,
      }}
    >
      {/* envelope */}
      <div style={{ position: "relative", width: "min(78vw, 340px)", aspectRatio: "1.45", background: "#FBF6EC", boxShadow: "0 18px 40px rgba(0,0,0,.25)", borderRadius: 4, transform: "rotate(-3deg)" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom right, transparent 49.5%, rgba(0,0,0,.06) 50%), linear-gradient(to bottom left, transparent 49.5%, rgba(0,0,0,.06) 50%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "58%", background: "#F3EADA", clipPath: "polygon(0 0, 100% 0, 50% 100%)", boxShadow: "inset 0 -2px 0 rgba(0,0,0,.05)" }} />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" style={{ position: "absolute", right: "8%", bottom: "12%", width: "26%", aspectRatio: "1", objectFit: "cover", border: "5px solid #fff", transform: "rotate(7deg)", boxShadow: "0 4px 10px rgba(0,0,0,.2)" }} />
        )}
        <div style={{ position: "absolute", left: "8%", bottom: "14%", textAlign: "left", fontFamily: HAND, fontSize: 26, lineHeight: 1, color: L.ink }}>
          pra {nameA}
          <div style={{ fontSize: 18, color: L.soft, marginTop: 4 }}>de {nameB} ♥</div>
        </div>
        <Heart color={L.heart} size={58} style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} className="sc-beat" />
      </div>
      <div style={{ marginTop: 40, fontFamily: HAND, fontSize: 30, lineHeight: 1.1 }}>a retrospectiva de {year}</div>
      <div style={{ marginTop: 22, display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", background: L.ink, color: "#FFF8EE", fontFamily: TYPE, fontSize: 16, letterSpacing: 1, borderRadius: 3, boxShadow: "3px 4px 0 rgba(0,0,0,.2)", animation: "scPulse 1.8s ease-in-out infinite" }}>
        toque para abrir ♥
      </div>
    </button>
  );
}

// ───────── aberturas ─────────
function HeroSol({ L, year, nameA, nameB, photos, opened, compact }: { L: Look; year: number; nameA: string; nameB: string; photos: string[]; opened: boolean; compact: boolean }) {
  const [ref, inView] = useInView<HTMLElement>();
  const on = opened && inView;
  return (
    <section ref={ref} className={on ? "sc-on" : undefined} style={{ position: "relative", minHeight: compact ? 560 : "100svh", overflow: "hidden", backgroundColor: L.paper, backgroundImage: NOISE, padding: "14cqw 6cqw 12cqw", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* papel rosa rasgado no lado direito */}
      {/* borda branca do rasgo + papel amarelo */}
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "45.2%", background: "#FFFDF6", clipPath: tornV(nameA + year + "b", 5) }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "44%", backgroundColor: L.paper2, backgroundImage: NOISE, clipPath: tornV(nameA + year, 6) }} />
      {/* polaroid de canto */}
      <div className="sc-in" style={{ ["--d" as string]: "800ms", position: "absolute", right: "-6cqw", bottom: "10cqw" }}>
        <Polaroid src={photos[1] ?? photos[0]} w="24cqw" rot={9} L={L} />
      </div>

      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="sc-in" style={{ ["--d" as string]: "0ms", position: "relative", padding: "2.6cqw 6cqw", background: "#FFFDF8", boxShadow: "0 1cqw 2.5cqw rgba(0,0,0,.12)", transform: "rotate(-1.5deg)", fontFamily: HAND, fontSize: "7cqw", lineHeight: 1 }}>
          <Tape L={L} w="16cqw" rot={-8} style={{ left: "-5cqw", top: "-2cqw" }} />
          a retrospectiva de
        </div>

        <div className="sc-in" style={{ ["--d" as string]: "150ms", marginTop: "7cqw" }}>
          <Ransom text={`${nameA} & ${nameB}`} seed={nameA + nameB} L={L} size={8.6} />
        </div>

        <div className="sc-pop" style={{ ["--d" as string]: "350ms", position: "relative", marginTop: "6cqw" }}>
          <PhotoYear year={year} photos={photos} L={L} />
          <Heart color={L.heart} size="11cqw" style={{ position: "absolute", top: "-6cqw", left: "38%", transform: "rotate(-12deg)" }} />
          <Heart color={L.heart2} size="10cqw" style={{ position: "absolute", bottom: "-3cqw", left: "-3cqw", transform: "rotate(-18deg)" }} />
          <Heart color={L.heart3} size="9cqw" style={{ position: "absolute", top: "-2cqw", right: "-2cqw", transform: "rotate(14deg)" }} />
          <Star color={L.heart2} size="8cqw" style={{ position: "absolute", bottom: "-4cqw", right: "18%", transform: "rotate(12deg)" }} />
        </div>

        <div className="sc-in" style={{ ["--d" as string]: "650ms", position: "relative", marginTop: "10cqw", width: "78cqw", transform: "rotate(-1deg)" }}>
          <Tape L={L} w="20cqw" rot={-30} style={{ left: "-6cqw", bottom: "-1cqw" }} color={L.tape2} />
          <Lined style={{ padding: "5cqw 5cqw 4cqw 9cqw", boxShadow: "0 1.5cqw 4cqw rgba(0,0,0,.12)" }}>
            <div style={{ fontFamily: HAND, fontSize: "5.6cqw", lineHeight: "7cqw", color: L.ink }}>
              Tudo o que vivemos esse ano, numa página só. ♥
            </div>
          </Lined>
        </div>

        <ScrollHint L={L} />
      </div>
    </section>
  );
}

function HeroKraft({ L, year, nameA, nameB, photos, opened, compact }: { L: Look; year: number; nameA: string; nameB: string; photos: string[]; opened: boolean; compact: boolean }) {
  const [ref, inView] = useInView<HTMLElement>();
  const on = opened && inView;
  const p = (i: number) => photos.length ? photos[i % photos.length] : undefined;
  return (
    <section ref={ref} className={on ? "sc-on" : undefined} style={{ position: "relative", minHeight: compact ? 560 : "100svh", overflow: "hidden", backgroundColor: L.paper, backgroundImage: NOISE, padding: "12cqw 6cqw 12cqw", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* tiras de papel rasgado */}
      <TornStrip style={{ top: "3cqw", left: "-10cqw", width: "70cqw", transform: "rotate(-8deg)" }} seed="a" />
      <TornStrip style={{ bottom: "8cqw", right: "-12cqw", width: "60cqw", transform: "rotate(-14deg)" }} seed="b" />

      {/* polaroids de canto */}
      <div className="sc-in" style={{ ["--d" as string]: "500ms", position: "absolute", right: "-6cqw", top: "16cqw" }}>
        <Polaroid src={p(1)} w="30cqw" rot={6} L={L} />
      </div>
      <div className="sc-in" style={{ ["--d" as string]: "600ms", position: "absolute", left: "-5cqw", bottom: "30cqw" }}>
        <Polaroid src={p(2)} w="27cqw" rot={-7} L={L} />
      </div>
      <div className="sc-in" style={{ ["--d" as string]: "700ms", position: "absolute", left: "-4cqw", top: "46cqw" }}>
        <Polaroid src={p(3)} w="22cqw" rot={-4} L={L} />
      </div>

      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="sc-in" style={{ ["--d" as string]: "0ms", position: "relative", zIndex: 2, marginBottom: "-4cqw", padding: "1.6cqw 6cqw", background: L.tape, fontFamily: HAND, fontWeight: 700, fontSize: "8cqw", lineHeight: 1, transform: "rotate(-2deg)", clipPath: TAPE_CLIP }}>
          {year}
        </div>
        <div className="sc-pop" style={{ ["--d" as string]: "150ms" }}>
          <Polaroid src={p(0)} w="70cqw" rot={-3} L={L} bigCaption>
            <div style={{ fontFamily: HAND, fontSize: "7.6cqw", lineHeight: 1.05, color: L.ink }}>
              A Retrospectiva de...
              <br />
              <span style={{ marginLeft: "8cqw" }}>
                {nameA} &amp; {nameB}
              </span>
            </div>
          </Polaroid>
        </div>

        <div className="sc-in" style={{ ["--d" as string]: "450ms", position: "relative", alignSelf: "flex-end", marginTop: "6cqw", marginRight: "2cqw", width: "58cqw", transform: "rotate(2deg)" }}>
          <Clip L={L} style={{ top: "-4cqw", left: "8cqw" }} />
          <Lined style={{ padding: "5cqw 4cqw 4cqw 8cqw", boxShadow: "0 1.5cqw 4cqw rgba(0,0,0,.2)" }}>
            <div style={{ fontFamily: HAND, fontSize: "5.2cqw", lineHeight: "7cqw" }}>
              Tudo o que vivemos esse ano, numa página só.
              <span style={{ color: L.accent }}> ♥</span>
            </div>
          </Lined>
        </div>
        <ScrollHint L={L} />
      </div>
    </section>
  );
}

// ───────── contador ─────────
function Counter({ L, days, year, startDate, variant }: { L: Look; days: NonNullable<ReturnType<typeof computeDays>>; year: number; startDate: string; variant: ScrapVariant }) {
  const [ref, on] = useInView<HTMLDivElement>();
  const n = useCountUp(days.inYear, on);
  const t = useLiveCounter(startDate);
  const since = days.start.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const pad = (x: number) => String(x).padStart(2, "0");
  return (
    <div ref={ref} className={on ? "sc-on" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <Label L={L}>{days.start.getFullYear() === year ? `desde ${since}` : `em ${year}`}, foram...</Label>

      {/* folha de calendário */}
      <div className="sc-pop" style={{ ["--d" as string]: "150ms", position: "relative", marginTop: "7cqw", width: "64cqw", background: "#FFFDF8", boxShadow: "0 2cqw 5cqw rgba(0,0,0,.18)", transform: "rotate(-2deg)" }}>
        <div style={{ background: L.accent, color: "#FFF8EE", fontFamily: TYPE, fontSize: "3.6cqw", letterSpacing: "0.12em", padding: "3cqw 0 2.4cqw" }}>DIAS JUNTOS EM {year}</div>
        <div style={{ position: "absolute", top: "-2.4cqw", left: 0, right: 0, display: "flex", justifyContent: "space-around", padding: "0 8cqw" }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ width: "2.6cqw", height: "6cqw", borderRadius: 99, background: "linear-gradient(#999,#ddd 40%,#888)", boxShadow: "0 .5cqw 1cqw rgba(0,0,0,.3)" }} />
          ))}
        </div>
        <div style={{ fontFamily: SERIF, fontSize: n > 999 ? "24cqw" : "30cqw", lineHeight: 1.05, padding: "3cqw 0 1cqw", color: L.ink }}>{n}</div>
        <div style={{ fontFamily: HAND, fontSize: "6cqw", paddingBottom: "4cqw", color: L.soft }}>dias de nós dois ♥</div>
      </div>

      {t && (
        <div className="sc-in" style={{ ["--d" as string]: "600ms", marginTop: "9cqw", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontFamily: HAND, fontSize: "6.4cqw", lineHeight: 1.1 }}>e juntos desde {since}:</div>
          <div style={{ display: "flex", gap: "3cqw", marginTop: "4cqw" }}>
            {[
              [t.y, t.y === 1 ? "ano" : "anos", -3],
              [t.mo, t.mo === 1 ? "mês" : "meses", 2],
              [t.da, t.da === 1 ? "dia" : "dias", -1.5],
            ].map(([v, l, r]) => (
              <div key={l as string} style={{ position: "relative", width: "21cqw", padding: "3.5cqw 0 2.5cqw", background: variant === "sol" ? "#FFFDF8" : "#F6EEDC", boxShadow: "0 1cqw 2.5cqw rgba(0,0,0,.15)", transform: `rotate(${r}deg)` }}>
                <Tape L={L} w="10cqw" rot={(r as number) * -2} style={{ top: "-2.2cqw", left: "5.5cqw" }} />
                <div style={{ fontFamily: SERIF, fontSize: "10cqw", lineHeight: 1 }}>{v as number}</div>
                <div style={{ fontFamily: HAND, fontSize: "5cqw", color: L.soft }}>{l as string}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "5cqw", fontFamily: TYPE, fontSize: "5cqw", letterSpacing: "0.08em", background: L.ink, color: "#FFF8EE", padding: "1.6cqw 4cqw", transform: "rotate(1deg)", fontVariantNumeric: "tabular-nums" }}>
            {pad(t.h)}:{pad(t.mi)}:{pad(t.se)}
          </div>
          <div style={{ fontFamily: HAND, fontSize: "5.2cqw", marginTop: "3cqw", color: L.soft }}>…e contando ♥</div>
        </div>
      )}
    </div>
  );
}

// ───────── linha do tempo ─────────
function Timeline({ L, months, year, variant }: { L: Look; months: { month: number; title: string; photo?: string }[]; year: number; variant: ScrapVariant }) {
  const [ref, on] = useInView<HTMLDivElement>();
  return (
    <div>
      <div ref={ref} className={on ? "sc-on" : undefined} style={{ textAlign: "center" }}>
        <Label L={L}>a nossa linha do tempo</Label>
        <div className="sc-in" style={{ ["--d" as string]: "120ms", fontFamily: HAND, fontWeight: 700, fontSize: "13cqw", lineHeight: 0.95, marginTop: "3cqw" }}>
          {year}, mês a mês
        </div>
      </div>
      <div style={{ position: "relative", marginTop: "8cqw" }}>
        {/* barbante */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 0, borderLeft: `0.6cqw dashed ${variant === "sol" ? "rgba(58,38,38,.35)" : "rgba(51,36,26,.45)"}`, transform: "translateX(-50%)" }} />
        {months.map((m, i) => (
          <TimelineItem key={`${m.month}-${i}`} L={L} m={m} i={i} />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ L, m, i }: { L: Look; m: { month: number; title: string; photo?: string }; i: number }) {
  const [ref, on] = useInView<HTMLDivElement>();
  const left = i % 2 === 0;
  const rot = left ? -3 : 3;
  return (
    <div ref={ref} className={on ? "sc-on" : undefined} style={{ position: "relative", display: "flex", justifyContent: left ? "flex-start" : "flex-end", paddingBottom: "8cqw" }}>
      {/* coração no barbante */}
      <Heart color={L.heart} size="7cqw" className="sc-pop" style={{ ["--d" as string]: "0ms", position: "absolute", left: "50%", top: "8cqw", transform: "translateX(-50%)" } as React.CSSProperties} />
      <div className="sc-in" style={{ ["--d" as string]: "100ms", width: "56cqw", position: "relative" }}>
        <div style={{ position: "relative", zIndex: 2, display: "inline-block", marginBottom: "-3cqw", marginLeft: left ? "4cqw" : "14cqw", padding: "1cqw 4cqw", background: i % 2 ? L.tape2 : L.tape, clipPath: TAPE_CLIP, fontFamily: TYPE, fontSize: "4cqw", letterSpacing: "0.06em", transform: `rotate(${-rot}deg)` }}>
          {MESES[m.month]?.toUpperCase()}
        </div>
        {m.photo ? (
          <Polaroid src={m.photo} w="56cqw" rot={rot} L={L}>
            {m.title && <div style={{ fontFamily: HAND, fontSize: "5.6cqw", lineHeight: 1.1, color: L.ink }}>{m.title}</div>}
          </Polaroid>
        ) : (
          <div style={{ transform: `rotate(${rot}deg)` }}>
            <Lined style={{ padding: "5cqw 4cqw 4cqw 8cqw", boxShadow: "0 1.5cqw 4cqw rgba(0,0,0,.14)" }}>
              <div style={{ fontFamily: HAND, fontSize: "6cqw", lineHeight: "7cqw" }}>{m.title}</div>
            </Lined>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────── mixtape (top 5) ─────────
function Mixtape({ L, songs, year, nameA, nameB }: { L: Look; songs: RetroSong[]; year: number; nameA: string; nameB: string }) {
  const [ref, on] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={on ? "sc-on" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <Label L={L}>a trilha sonora do casal</Label>
      {/* fita cassete */}
      <div className="sc-pop" style={{ ["--d" as string]: "150ms", position: "relative", marginTop: "7cqw", width: "74cqw", aspectRatio: "1.6", background: "#2E2A2B", borderRadius: "3cqw", boxShadow: "0 2cqw 5cqw rgba(0,0,0,.3)", transform: "rotate(-2deg)", padding: "4cqw" }}>
        <div style={{ position: "relative", height: "62%", background: "#FFFDF8", borderRadius: "1.5cqw", padding: "2cqw 3cqw", backgroundImage: `linear-gradient(${L.paper2} 0 22%, transparent 22%)` }}>
          <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: "6.2cqw", lineHeight: 1, textAlign: "left" }}>nossa mixtape {year}</div>
          <div style={{ position: "absolute", left: "16%", right: "16%", top: "48%", height: "36%", background: "#3A3536", borderRadius: 99, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 3cqw" }}>
            {[0, 1].map((k) => (
              <span key={k} className="sc-spin" style={{ width: "9cqw", height: "9cqw", borderRadius: "50%", background: "#fff", border: "1.6cqw dashed #3A3536", boxSizing: "border-box" }} />
            ))}
          </div>
        </div>
        <div style={{ fontFamily: TYPE, fontSize: "3cqw", color: "#cfc6c0", marginTop: "2.5cqw", textAlign: "left" }}>
          LADO A · {nameA.toUpperCase()} &amp; {nameB.toUpperCase()}
        </div>
      </div>

      <div className="sc-in" style={{ ["--d" as string]: "400ms", position: "relative", marginTop: "8cqw", width: "82cqw", transform: "rotate(1deg)" }}>
        <Tape L={L} w="18cqw" rot={-4} style={{ top: "-2.5cqw", left: "32cqw" }} />
        <Lined style={{ padding: "6cqw 5cqw 4cqw 10cqw", boxShadow: "0 1.5cqw 4cqw rgba(0,0,0,.14)", textAlign: "left" }}>
          {songs.map((s, i) => {
            const [nome, artista] = s.title.split(/\s+-\s+/);
            return (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "2.5cqw", minHeight: "7cqw", lineHeight: "7cqw" }}>
                <span style={{ fontFamily: HAND, fontWeight: 700, fontSize: "6cqw", color: L.accent, width: "5cqw" }}>{i + 1}.</span>
                <span style={{ fontFamily: HAND, fontSize: "6cqw", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {nome}
                  {artista && <span style={{ color: L.soft, fontSize: "4.6cqw" }}> — {artista}</span>}
                </span>
                {i === 0 && <span style={{ fontFamily: HAND, fontSize: "4.4cqw", color: L.accent, whiteSpace: "nowrap" }}>♪ tocando</span>}
              </div>
            );
          })}
        </Lined>
      </div>
    </div>
  );
}

// ───────── recibo (números do casal) ─────────
function Receipt({ L, stats, year, nameA, nameB }: { L: Look; stats: RetroStat[]; year: number; nameA: string; nameB: string }) {
  const [ref, on] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={on ? "sc-on" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <Label L={L}>o nosso ano em números</Label>
      <div className="sc-in" style={{ ["--d" as string]: "150ms", position: "relative", marginTop: "7cqw", width: "76cqw", background: "#FFFEFA", fontFamily: TYPE, color: "#2B2B2B", padding: "7cqw 6cqw 10cqw", boxShadow: "0 2cqw 5cqw rgba(0,0,0,.16)", transform: "rotate(-1.5deg)", clipPath: RECEIPT_CLIP }}>
        <div style={{ fontSize: "5cqw", letterSpacing: "0.1em" }}>RECIBO DO AMOR</div>
        <div style={{ fontSize: "3.2cqw", marginTop: "1.5cqw", opacity: 0.7 }}>
          {nameA.toUpperCase()} &amp; {nameB.toUpperCase()} · {year}
        </div>
        <Dashes />
        {stats.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: "3cqw", textAlign: "left", fontSize: "3.8cqw", lineHeight: 1.35, margin: "2.6cqw 0" }}>
            <span style={{ flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: "5cqw", whiteSpace: "nowrap" }}>{s.value}</span>
          </div>
        ))}
        <Dashes />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "4.6cqw" }}>
          <span>TOTAL</span>
          <span>impagável ♥</span>
        </div>
        <div style={{ fontSize: "3.2cqw", marginTop: "5cqw", opacity: 0.7 }}>obrigado pela preferência.
          <br />volte sempre (de preferência pra sempre)</div>
        <div style={{ marginTop: "4cqw", height: "9cqw", background: "repeating-linear-gradient(90deg,#222 0 .6cqw,transparent .6cqw 1.1cqw,#222 1.1cqw 1.5cqw,transparent 1.5cqw 2.4cqw)" }} />
      </div>
    </div>
  );
}

// ───────── promessas ─────────
function Promises({ L, promises, year }: { L: Look; promises: string[]; year: number }) {
  const [ref, on] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={on ? "sc-on" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Label L={L}>pro ano que vem</Label>
      <div className="sc-in" style={{ ["--d" as string]: "150ms", position: "relative", marginTop: "7cqw", width: "84cqw", transform: "rotate(-1deg)" }}>
        {/* espiral do caderno */}
        <div style={{ position: "absolute", left: "-2.5cqw", top: "4cqw", bottom: "4cqw", display: "flex", flexDirection: "column", justifyContent: "space-between", zIndex: 2 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} style={{ width: "6cqw", height: "2.2cqw", borderRadius: 99, border: "0.7cqw solid #8a8a8a", background: "transparent" }} />
          ))}
        </div>
        <Lined style={{ padding: "6cqw 5cqw 6cqw 12cqw", boxShadow: "0 1.5cqw 4cqw rgba(0,0,0,.16)" }}>
          <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: "8cqw", lineHeight: "7cqw", marginBottom: "3cqw", color: L.accent }}>Promessas pra {year + 1}</div>
          {promises.map((p, i) => (
            <div key={i} className="sc-in" style={{ ["--d" as string]: `${300 + i * 180}ms`, display: "flex", alignItems: "flex-start", gap: "3cqw", fontFamily: HAND, fontSize: "6cqw", lineHeight: "7cqw" }}>
              <Heart color={L.heart} size="5cqw" style={{ flexShrink: 0, marginTop: "1cqw" }} />
              <span>{p}</span>
            </div>
          ))}
        </Lined>
      </div>
    </div>
  );
}

// ───────── carta ─────────
function Letter({ L, message, nameA, nameB }: { L: Look; message: string; nameA: string; nameB: string }) {
  const [ref, on] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={on ? "sc-on" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Label L={L}>uma cartinha</Label>
      <div className="sc-in" style={{ ["--d" as string]: "150ms", position: "relative", marginTop: "7cqw", width: "86cqw", transform: "rotate(1deg)" }}>
        <Tape L={L} w="18cqw" rot={-35} style={{ top: "-1cqw", left: "-5cqw" }} />
        <Tape L={L} w="18cqw" rot={35} style={{ top: "-1cqw", right: "-5cqw" }} color={L.tape2} />
        <Lined style={{ padding: "7cqw 5cqw 6cqw 10cqw", boxShadow: "0 1.5cqw 4cqw rgba(0,0,0,.16)" }}>
          <div style={{ fontFamily: HAND, fontSize: "6.4cqw", lineHeight: "7cqw" }}>{nameA},</div>
          <div style={{ fontFamily: HAND, fontSize: message.length > 300 ? "5.4cqw" : "6cqw", lineHeight: "7cqw", whiteSpace: "pre-wrap" }}>{message}</div>
          <div style={{ fontFamily: HAND, fontSize: "6.4cqw", lineHeight: "7cqw", textAlign: "right", marginTop: "3cqw" }}>
            com amor, {nameB} <span style={{ color: L.accent }}>♥</span>
          </div>
        </Lined>
      </div>
    </div>
  );
}

// ───────── final ─────────
function Final({ L, year, slug, photo, qrPhoto }: { L: Look; year: number; slug?: string; photo?: string; qrPhoto?: string }) {
  const [ref, on] = useInView<HTMLDivElement>();
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${slug ?? ""}`;
  return (
    <div ref={ref} className={on ? "sc-on" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div className="sc-in" style={{ ["--d" as string]: "0ms", fontFamily: HAND, fontSize: "8cqw" }}>e o melhor ainda vem aí...</div>
      <div className="sc-pop" style={{ ["--d" as string]: "200ms", fontFamily: SERIF, fontSize: "17cqw", lineHeight: 1, marginTop: "2cqw" }}>
        que venha <span style={{ color: L.accent }}>{year + 1}</span>
      </div>
      {slug && (
        <div className="sc-in" style={{ ["--d" as string]: "450ms", marginTop: "9cqw", position: "relative" }}>
          <Polaroid w="44cqw" rot={-3} L={L} qr={url} qrPhoto={qrPhoto ?? photo}>
            <div style={{ fontFamily: HAND, fontSize: "5cqw", color: L.ink }}>escaneie ♥</div>
          </Polaroid>
        </div>
      )}
      <Link href="/criar?estilo=retro" style={{ marginTop: "10cqw", fontFamily: HAND, fontSize: "5cqw", color: L.soft, textDecoration: "underline", textUnderlineOffset: "1cqw" }}>
        crie a retrospectiva de vocês
      </Link>
    </div>
  );
}

// ───────── peças de colagem ─────────
function Sheet({ L, bg, children, edge, stickers }: { L: Look; bg: string; children: React.ReactNode; edge?: boolean; stickers?: string }) {
  const seed = bg;
  return (
    <section style={{ position: "relative", backgroundColor: bg, backgroundImage: NOISE, padding: "18cqw 6cqw 16cqw", color: L.ink }}>
      {stickers && <Stickers L={L} seed={stickers} />}
      {edge && <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: "-3.5cqw", height: "4cqw", backgroundColor: bg, backgroundImage: NOISE, clipPath: tornH(seed, true), zIndex: 1 }} />}
      {children}
    </section>
  );
}

function Label({ L, children }: { L: Look; children: React.ReactNode }) {
  return (
    <div className="sc-in" style={{ ["--d" as string]: "0ms", display: "inline-block", padding: "1.6cqw 5cqw", background: "#FFFDF8", fontFamily: TYPE, fontSize: "3.8cqw", letterSpacing: "0.05em", color: L.ink, boxShadow: "0 1cqw 2cqw rgba(0,0,0,.12)", transform: "rotate(-1.5deg)" }}>
      {children}
    </div>
  );
}

function Lined({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "relative",
        background: "#FFFDF7",
        backgroundImage: "linear-gradient(90deg, transparent 6cqw, rgba(226,90,110,.45) 6cqw, rgba(226,90,110,.45) 6.3cqw, transparent 6.3cqw), repeating-linear-gradient(transparent 0, transparent calc(7cqw - 1px), rgba(120,150,200,.35) calc(7cqw - 1px), rgba(120,150,200,.35) 7cqw)",
        backgroundPosition: "0 0, 0 5cqw",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const TAPE_CLIP = "polygon(3% 0, 97% 0, 100% 18%, 97% 36%, 100% 54%, 97% 72%, 100% 90%, 97% 100%, 3% 100%, 0 82%, 3% 64%, 0 46%, 3% 28%, 0 10%)";
const RECEIPT_CLIP = "polygon(0 0, 100% 0, 100% 97%, 96% 100%, 92% 97%, 88% 100%, 84% 97%, 80% 100%, 76% 97%, 72% 100%, 68% 97%, 64% 100%, 60% 97%, 56% 100%, 52% 97%, 48% 100%, 44% 97%, 40% 100%, 36% 97%, 32% 100%, 28% 97%, 24% 100%, 20% 97%, 16% 100%, 12% 97%, 8% 100%, 4% 97%, 0 100%)";

function Tape({ L, w, rot, style, color }: { L: Look; w: string; rot: number; style?: React.CSSProperties; color?: string }) {
  return <span aria-hidden style={{ position: "absolute", zIndex: 3, width: w, height: "5cqw", background: color ?? L.tape, clipPath: TAPE_CLIP, transform: `rotate(${rot}deg)`, boxShadow: "inset 0 0 0 100px rgba(255,255,255,.08)", ...style }} />;
}

function Clip({ L, style }: { L: Look; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 24 60" style={{ position: "absolute", zIndex: 3, width: "5cqw", ...style }}>
      <path d="M8 52 V12 a6 6 0 0 1 12 0 V46 a10 10 0 0 1 -20 0 V16" fill="none" stroke={L.soft} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function Heart({ color, size, style, className }: { color: string; size: number | string; style?: React.CSSProperties; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 30" className={className} style={{ width: size, height: size, display: "block", filter: "drop-shadow(0 .6cqw .8cqw rgba(0,0,0,.25))", ...style }}>
      <path d="M16 28 C 6 20, 1 14, 1 8.5 A 7 7 0 0 1 16 6 A 7 7 0 0 1 31 8.5 C 31 14, 26 20, 16 28 Z" fill={color} stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M7 8 a3 3 0 0 1 4 -2" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Star({ color, size, style, className }: { color: string; size: number | string; style?: React.CSSProperties; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className} style={{ width: size, height: size, display: "block", filter: "drop-shadow(0 .6cqw .8cqw rgba(0,0,0,.25))", ...style }}>
      <path d="M16 2.5 l3.9 8.3 9.1 1.1 -6.7 6.2 1.8 9 -8.1 -4.5 -8.1 4.5 1.8 -9 -6.7 -6.2 9.1 -1.1 z" fill={color} stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}

// adesivos soltos nas seções (só no visual Sol — "as coisinhas")
function Stickers({ L, seed }: { L: Look; seed: string }) {
  const r = rng(seed);
  const items = [
    { kind: "heart", c: L.heart2, top: 5 + r() * 4, side: "left", x: 4 + r() * 6, rot: -15 + r() * 10, size: 8 },
    { kind: "star", c: L.accent, top: 6 + r() * 6, side: "right", x: 5 + r() * 6, rot: r() * 25, size: 7.5 },
  ];
  return (
    <>
      {items.map((it, i) => {
        const st: React.CSSProperties = { position: "absolute", top: `${it.top}cqw`, [it.side]: `${it.x}cqw`, transform: `rotate(${it.rot}deg)`, zIndex: 2 };
        return it.kind === "heart" ? <Heart key={i} color={it.c} size={`${it.size}cqw`} style={st} /> : <Star key={i} color={it.c} size={`${it.size}cqw`} style={st} />;
      })}
    </>
  );
}

function Polaroid({ src, w, rot, L, children, bigCaption, qr, qrPhoto }: { src?: string; w: string; rot: number; L: Look; children?: React.ReactNode; bigCaption?: boolean; qr?: string; qrPhoto?: string }) {
  return (
    <div style={{ position: "relative", width: w, background: "#FFFEFA", padding: `3cqw 3cqw ${children ? (bigCaption ? "4cqw" : "3cqw") : "11cqw"}`, boxShadow: "0 1.5cqw 4cqw rgba(0,0,0,.25)", transform: `rotate(${rot}deg)` }}>
      <Tape L={L} w="16cqw" rot={rot * -1.5} style={{ top: "-2.4cqw", left: "50%", marginLeft: "-8cqw" }} />
      <div style={{ position: "relative", width: "100%", aspectRatio: qr ? "1" : "4/5", overflow: "hidden", background: qr ? "#fff" : "#E8DDD0" }}>
        {qr ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`} alt="QR code" style={{ width: "100%", height: "100%", display: "block" }} />
            {qrPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrPhoto} alt="" style={{ position: "absolute", top: "50%", left: "50%", width: "22%", height: "22%", transform: "translate(-50%,-50%)", borderRadius: "50%", border: "0.8cqw solid #fff", objectFit: "cover" }} />
            )}
          </>
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "sepia(.12) saturate(1.05) contrast(1.02)" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: `linear-gradient(160deg, ${L.paper2}, ${L.paper})` }}>
            <Heart color={L.heart} size="30%" />
          </div>
        )}
      </div>
      {children && <div style={{ paddingTop: "3cqw", textAlign: "center" }}>{children}</div>}
    </div>
  );
}

function TornStrip({ style, seed, color = "#F8F4EC" }: { style?: React.CSSProperties; seed: string; color?: string }) {
  return <div aria-hidden style={{ position: "absolute", height: "12cqw", background: color, clipPath: tornBoth(seed), boxShadow: "0 1cqw 2cqw rgba(0,0,0,.15)", ...style }} />;
}

// letras recortadas de revista
function Ransom({ text, seed, L, size }: { text: string; seed: string; L: Look; size: number }) {
  const r = rng(seed);
  const styles = [
    { bg: "#FFFDF8", fg: L.ink, font: SERIF },
    { bg: L.ink, fg: "#FFF8EE", font: BOLD },
    { bg: L.paper2, fg: L.ink, font: TYPE },
    { bg: "#FFFFFF", fg: L.accent, font: SERIF },
    { bg: L.heart2, fg: "#FFF", font: BOLD },
    { bg: L.accent, fg: "#FFF", font: SERIF },
  ];
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${size * 0.45}cqw ${size * 0.6}cqw`, maxWidth: "88cqw" }}>
      {words.map((w, wi) =>
        w === "&" ? (
          <span key={wi} style={{ fontFamily: HAND, fontWeight: 700, fontSize: `${size * 1.25}cqw`, color: L.accent, lineHeight: 1, alignSelf: "center" }}>
            &amp;
          </span>
        ) : (
          <span key={wi} style={{ display: "inline-flex", gap: `${size * 0.08}cqw` }}>
            {Array.from(w).map((ch, ci) => {
              const s = styles[Math.floor(r() * styles.length)];
              const rot = (r() - 0.5) * 12;
              const dy = (r() - 0.5) * size * 0.25;
              return (
                <span
                  key={ci}
                  style={{
                    display: "inline-block",
                    background: s.bg,
                    color: s.fg,
                    fontFamily: s.font,
                    fontSize: `${size * (0.85 + r() * 0.3)}cqw`,
                    lineHeight: 1,
                    padding: `${size * 0.1}cqw ${size * 0.12}cqw`,
                    transform: `rotate(${rot}deg) translateY(${dy}cqw)`,
                    boxShadow: "0 .5cqw 1cqw rgba(0,0,0,.18)",
                    textTransform: r() > 0.5 ? "uppercase" : "lowercase",
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        )
      )}
    </div>
  );
}

// o ano com fotos dentro dos números
function PhotoYear({ year, photos, L }: { year: number; photos: string[]; L: Look }) {
  const digits = String(year).split("");
  const size = "33cqw";
  return (
    <div style={{ display: "flex", gap: "0.5cqw" }}>
      {digits.map((dg, i) => {
        const ph = photos.length ? photos[i % photos.length] : undefined;
        const fill: React.CSSProperties = ph
          ? { backgroundImage: `url("${ph}")`, backgroundSize: "cover", backgroundPosition: "center" }
          : { backgroundImage: `repeating-linear-gradient(45deg, ${L.soft} 0 2cqw, ${L.paper2} 2cqw 4cqw)` };
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", fontFamily: BOLD, fontWeight: 800, fontSize: size, lineHeight: 0.92, letterSpacing: "-0.04em", transform: `rotate(${[-3, 2, -2, 3][i % 4]}deg)` }}>
            {/* contorno branco + sombra (camada de baixo) */}
            <span aria-hidden style={{ color: "#fff", WebkitTextStroke: "3.2cqw #fff", filter: "drop-shadow(0 1.2cqw 1.6cqw rgba(0,0,0,.25))" }}>{dg}</span>
            {/* foto recortada no formato do número */}
            <span style={{ position: "absolute", inset: 0, color: "transparent", WebkitBackgroundClip: "text", backgroundClip: "text", ...fill }}>{dg}</span>
          </span>
        );
      })}
    </div>
  );
}

function ScrollHint({ L }: { L: Look }) {
  return (
    <div className="sc-in" style={{ ["--d" as string]: "900ms", marginTop: "9cqw", fontFamily: HAND, fontSize: "5cqw", color: L.soft, display: "flex", flexDirection: "column", alignItems: "center" }}>
      role pra baixo
      <span style={{ fontSize: "6cqw", lineHeight: 1, animation: "scBounce 1.6s ease-in-out infinite" }}>↓</span>
    </div>
  );
}

// bordas rasgadas (clip-path com pontos "aleatórios" fixos por seed)
function tornH(seed: string, top: boolean) {
  const r = rng(seed);
  const pts: string[] = [];
  for (let x = 0; x <= 100; x += 2.5) pts.push(`${x}% ${top ? 20 + r() * 80 : r() * 80}%`);
  return top ? `polygon(0 100%, ${pts.join(", ")}, 100% 100%)` : `polygon(0 0, 100% 0, ${pts.reverse().join(", ")})`;
}
function tornV(seed: string, amp: number) {
  const r = rng(seed);
  const pts: string[] = [];
  for (let y = 0; y <= 100; y += 2) pts.push(`${r() * amp}% ${y}%`);
  return `polygon(${pts.join(", ")}, 100% 100%, 100% 0)`;
}
function tornBoth(seed: string) {
  const r = rng(seed);
  const top: string[] = [];
  const bot: string[] = [];
  for (let x = 0; x <= 100; x += 3) {
    top.push(`${x}% ${r() * 22}%`);
    bot.push(`${100 - x}% ${78 + r() * 22}%`);
  }
  return `polygon(${top.join(", ")}, ${bot.join(", ")})`;
}

function Dashes() {
  return <div style={{ borderTop: "0.5cqw dashed #9a9a9a", margin: "4cqw 0" }} />;
}

const CSS = `
@keyframes scPulse { 0%,100% { transform: scale(1) rotate(-1deg) } 50% { transform: scale(1.05) rotate(1deg) } }
@keyframes scBounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(1.5cqw) } }
@keyframes scBeat { 0%,100% { transform: translate(-50%,-50%) scale(1) } 15% { transform: translate(-50%,-50%) scale(1.15) } 30% { transform: translate(-50%,-50%) scale(1) } }
@keyframes scSpin { to { transform: rotate(360deg) } }
.sc-beat { animation: scBeat 1.6s ease-in-out infinite; }
.sc-spin { animation: scSpin 3s linear infinite; }
.sc-in, .sc-pop { opacity: 0; transition: opacity .8s cubic-bezier(.2,.8,.2,1), translate .8s cubic-bezier(.2,.8,.2,1), scale .8s cubic-bezier(.2,.8,.2,1); transition-delay: var(--d, 0ms); }
.sc-in { translate: 0 6cqw; }
.sc-pop { scale: .8; }
.sc-on .sc-in, .sc-on .sc-pop { opacity: 1; translate: 0 0; scale: 1; }
@media (prefers-reduced-motion: reduce) {
  .sc-in, .sc-pop { transition: none !important; opacity: 1 !important; translate: none !important; scale: none !important; }
  .sc-beat, .sc-spin { animation: none !important; }
}
`;

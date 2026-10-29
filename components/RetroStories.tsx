"use client";

// components/RetroStories.tsx
// "Retrospectiva do Casal" — uma página de ROLAGEM (igual à Clássica), com
// o visual das retrospectivas de fim de ano: cada seção é uma "cartela" de
// cor chapada, números gigantes e uma linha do tempo com um momento por mês.
//
// Ordem: capa "toque para abrir" → abertura (nomes + ano) → contador ao vivo
// → linha do tempo do ano → top 5 músicas → prints → números do casal →
// mensagem → card pra print → "que venha o próximo ano" + QR.
//
// Usado em três lugares (igual à Clássica):
//   1. app/[slug]/page.tsx            — a página final publicada
//   2. app/criar (preview no iPhone)  — compact, sem capa
//   3. app/retrospectiva/exemplo      — demo com dados fictícios
//
// Identidade própria de propósito: nada de nome, logo, verde ou fonte de
// nenhuma plataforma de música. Os tamanhos usam unidades de container (cqw),
// então o mesmo layout escala do mini preview até a tela cheia do celular.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Share2, Music2, Camera, Calendar, ChevronDown } from "lucide-react";
import type { CouplePageDoc, RetroSong, RetroStat } from "@/types/page";
import RetroScrapbook from "@/components/RetroScrapbook";
import MusicDock, { type MusicApi } from "@/components/MusicDock";

type Doc = Partial<CouplePageDoc> & { slug?: string };

// ───────── paletas ─────────
// Cada tema é uma sequência de "cartelas" (fundo + texto + destaques).
// Cada seção da página pega a próxima — é isso que dá a cara de retrospectiva.
type Swatch = { bg: string; fg: string; ac: string; ac2: string };
export const RETRO_THEMES: Record<string, { name: string; preview: string; swatches: Swatch[] }> = {
  "retro-paixao": {
    name: "Paixão",
    preview: "linear-gradient(135deg,#E8336D,#2B0B3F 55%,#FF8A3D)",
    swatches: [
      { bg: "#E8336D", fg: "#FFF4F7", ac: "#2B0B3F", ac2: "#FFD23F" },
      { bg: "#2B0B3F", fg: "#FFE9F0", ac: "#FF5C8A", ac2: "#FFD23F" },
      { bg: "#FFD9E4", fg: "#2B0B3F", ac: "#E8336D", ac2: "#FF8A3D" },
      { bg: "#FF8A3D", fg: "#2B0B3F", ac: "#FFF4F7", ac2: "#E8336D" },
      { bg: "#6A1B4D", fg: "#FFE9F0", ac: "#FFD23F", ac2: "#FF5C8A" },
    ],
  },
  "retro-neon": {
    name: "Neon",
    preview: "linear-gradient(135deg,#0E0B1F,#FF3CAC 55%,#00D4FF)",
    swatches: [
      { bg: "#FF3CAC", fg: "#0E0B1F", ac: "#FFF15C", ac2: "#0E0B1F" },
      { bg: "#0E0B1F", fg: "#F5F3FF", ac: "#FF3CAC", ac2: "#00D4FF" },
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
      { bg: "#FFF1E0", fg: "#2E294E", ac: "#FF6B35", ac2: "#D7263D" },
      { bg: "#D7263D", fg: "#FFF8F0", ac: "#FFE1A8", ac2: "#2E294E" },
      { bg: "#F7C59F", fg: "#2E294E", ac: "#D7263D", ac2: "#FF6B35" },
    ],
  },
};
// Visuais de colagem (scrapbook) — renderizados por components/RetroScrapbook.
export const SCRAP_THEMES: Record<string, { name: string; desc: string; preview: string }> = {
  "scrap-kraft": { name: "Kraft Polaroid", desc: "papel pardo, polaroids e fita adesiva", preview: "linear-gradient(135deg,#C9A378,#A97F55)" },
  "scrap-creme": { name: "Papel Creme", desc: "papel claro, polaroids e o ano com as fotos de vocês", preview: "linear-gradient(135deg,#F4EFE7,#D8CEBF)" },
};
export const DEFAULT_RETRO_THEME = "scrap-kraft";
const getRetroTheme = (id?: string) => RETRO_THEMES[id ?? ""] ?? RETRO_THEMES["retro-paixao"];

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

// Dias juntos DENTRO do ano da retrospectiva e o total desde o começo.
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

// Contador ao vivo (anos/meses/dias + relógio), o mesmo da Clássica.
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

// Marca quando um elemento entra na tela (dispara as animações de entrada).
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  // navegador sem IntersectionObserver (raríssimo): mostra tudo direto
  const [inView, setInView] = useState(() => typeof window !== "undefined" && typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      // threshold 0 + margem: funciona até pra seções mais altas que a tela
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

export default function RetroStories({ page, compact = false }: { page: Doc; compact?: boolean }) {
  // "scrap-rosa" (versão antiga) cai no Papel Creme
  if (page.theme === "scrap-creme" || page.theme === "scrap-rosa") return <RetroScrapbook page={page} variant="creme" compact={compact} />;
  if (!page.theme || !RETRO_THEMES[page.theme]) return <RetroScrapbook page={page} variant="kraft" compact={compact} />;
  return <RetroColorido page={page} compact={compact} />;
}

// Versão "colorida" (cartelas de cor chapada) — temas retro-paixao/neon/por-do-sol.
function RetroColorido({ page, compact = false }: { page: Doc; compact?: boolean }) {
  const theme = getRetroTheme(page.theme);
  const S = theme.swatches;
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
  const message = page.message?.trim() ?? "";
  const promises = (page.retroPromises ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 5);
  const music = useRef<MusicApi | null>(null);
  const coverPhoto = months.find((m) => m.photo)?.photo ?? page.photos?.[0];
  const [opened, setOpened] = useState(compact);

  return (
    <div
      style={{
        minHeight: compact ? "100%" : "100vh",
        background: compact ? S[0].bg : "#0b0710",
        fontFamily: B_FONT,
        overflowX: "hidden",
        // não deixa a página rolar enquanto a capa está fechada
        ...(opened ? {} : { height: "100vh", overflow: "hidden" }),
      }}
    >
      <style>{CSS}</style>
      <div style={{ maxWidth: compact ? "none" : 520, margin: "0 auto", containerType: "inline-size", position: "relative" }}>
        {/* ───── abertura ───── */}
        <Section sw={S[0]} minH={compact ? 540 : "100svh"} center blobs={0} on={opened ? undefined : false}>
          <Kicker>a retrospectiva de</Kicker>
          <div className="rs-in" style={{ ["--d" as string]: "120ms", fontFamily: D_FONT, fontWeight: 800, fontSize: "11cqw", lineHeight: 1.02, marginTop: "3cqw" }}>
            {nameA} <span style={{ color: S[0].ac2 }}>&</span> {nameB}
          </div>
          <div className="rs-pop" style={{ ["--d" as string]: "300ms", fontFamily: D_FONT, fontWeight: 800, fontSize: "38cqw", lineHeight: 0.9, letterSpacing: "-0.04em", color: S[0].ac, marginTop: "5cqw" }}>
            {year}
          </div>
          <div className="rs-in" style={{ ["--d" as string]: "600ms", fontSize: "4.4cqw", opacity: 0.9, marginTop: "6cqw", maxWidth: "75cqw", lineHeight: 1.45 }}>
            Tudo o que vivemos esse ano, numa página só. ♥
          </div>
          <div className="rs-in" style={{ ["--d" as string]: "900ms", marginTop: "16cqw", display: "flex", flexDirection: "column", alignItems: "center", fontSize: "3.4cqw", fontWeight: 600, opacity: 0.85 }}>
            role pra baixo
            <ChevronDown size={20} style={{ animation: "rsBounce 1.6s ease-in-out infinite" }} />
          </div>
        </Section>

        {/* ───── contador ───── */}
        {days && <CounterSection sw={S[1]} days={days} year={year} startDate={page.startDate!} />}

        {/* ───── linha do tempo ───── */}
        {months.length > 0 && <TimelineSection sw={S[2]} months={months} year={year} />}

        {/* ───── músicas ───── */}
        {songs.length > 0 && <SongsSection sw={S[3]} songs={songs} />}

        {/* ───── promessas pro próximo ano ───── */}
        {promises.length > 0 && (
          <Section sw={S[1]} blobs={1}>
            <Kicker>pro ano que vem</Kicker>
            <Title d={120} left>
              Promessas
              <br />
              pra {year + 1}
            </Title>
            <div style={{ marginTop: "7cqw", display: "grid", gap: "3.5cqw" }}>
              {promises.map((p, i) => (
                <div key={i} className="rs-in" style={{ ["--d" as string]: `${250 + i * 150}ms`, display: "flex", gap: "3.5cqw", alignItems: "flex-start", fontSize: "5cqw", lineHeight: 1.35, fontWeight: 600 }}>
                  <Heart size={18} color={S[1].ac2} fill={S[1].ac2} style={{ flexShrink: 0, marginTop: "1cqw" }} />
                  {p}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ───── números ───── */}
        {stats.length > 0 && <StatsSection sw={S[4]} stats={stats} />}

        {/* ───── mensagem ───── */}
        {message && (
          <Section sw={S[0]} center blobs={0}>
            <Heart className="rs-pop" style={{ ["--d" as string]: "0ms" } as React.CSSProperties} size={44} color={S[0].ac2} fill={S[0].ac2} />
            <Kicker d={150}>
              de {nameB} pra {nameA}
            </Kicker>
            <div className="rs-in" style={{ ["--d" as string]: "300ms", fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: message.length > 260 ? "5.2cqw" : "6.4cqw", lineHeight: 1.45, marginTop: "6cqw", maxWidth: "84cqw" }}>
              “{message}”
            </div>
          </Section>
        )}

        {/* ───── card pra print ───── */}
        <SummarySection sw={S[1]} card={S[0]} year={year} nameA={nameA} nameB={nameB} days={days} songs={songs} stats={stats} cover={coverPhoto} slug={page.slug} compact={compact} />

        {/* ───── final ───── */}
        <Section sw={S[2]} center blobs={1}>
          <Kicker>e o melhor ainda vem aí</Kicker>
          <div className="rs-pop" style={{ ["--d" as string]: "150ms", fontFamily: D_FONT, fontWeight: 800, fontSize: "17cqw", lineHeight: 0.95, marginTop: "4cqw" }}>
            Que venha
            <br />
            <span style={{ color: S[2].ac }}>{year + 1}</span>
          </div>
          <div className="rs-in" style={{ ["--d" as string]: "400ms", fontSize: "4.4cqw", opacity: 0.85, marginTop: "5cqw" }}>
            com você, de novo. ♥
          </div>
          {page.slug && (
            <div className="rs-in" style={{ ["--d" as string]: "600ms", marginTop: "8cqw", display: "flex", flexDirection: "column", alignItems: "center" }}>
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
              <div style={{ fontSize: "3.2cqw", opacity: 0.75, marginTop: "2.5cqw" }}>escaneie ou imprima pra presentear</div>
            </div>
          )}
          <div style={{ marginTop: "10cqw", display: "inline-flex", alignItems: "center", gap: "1.5cqw", fontFamily: D_FONT, fontWeight: 800, fontSize: "4cqw" }}>
            <Heart size={13} color={S[2].ac} fill={S[2].ac} /> Nosso {year}
          </div>
          <Link href="/criar?estilo=retro" style={{ marginTop: "1.5cqw", fontSize: "3.2cqw", color: S[2].fg, opacity: 0.7, textDecoration: "underline", textUnderlineOffset: "1cqw" }}>
            Crie a retrospectiva de vocês
          </Link>
        </Section>

        {!compact && songs[0] && <div style={{ height: 140, background: S[2].bg }} />}
      </div>
      {!compact && <MusicDock url={songs[0]?.url} title={songs[0]?.title ?? ""} apiRef={music} look={{ bg: "#fff", fg: "#1b1b1f", ac: S[0].bg, font: B_FONT, radius: 16 }} />}
      {/* ───── capa "toque para abrir" (fora do preview do quiz) ───── */}
      {!compact && (
        <button
          onClick={() => {
            music.current?.play(); // dentro do toque, senão o navegador bloqueia o som
            setOpened(true);
          }}
          aria-hidden={opened}
          tabIndex={opened ? -1 : 0}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            border: "none",
            cursor: "pointer",
            background: S[1].bg,
            color: S[1].fg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            fontFamily: B_FONT,
            padding: 32,
            transform: opened ? "translateY(-105%)" : "none",
            transition: "transform .9s cubic-bezier(.7,0,.25,1)",
            pointerEvents: opened ? "none" : "auto",
            overflow: "hidden",
          }}
        >
          <Blobs sw={S[1]} variant={2} />
          <div style={{ position: "relative", fontSize: 13, letterSpacing: "0.3em", fontWeight: 700, opacity: 0.8 }}>PRA VOCÊ</div>
          <div style={{ position: "relative", fontFamily: D_FONT, fontWeight: 800, fontSize: 46, lineHeight: 1 }}>
            Nosso
            <br />
            <span style={{ color: S[1].ac, fontSize: 104, letterSpacing: "-0.04em" }}>{year}</span>
          </div>
          <div style={{ position: "relative", fontSize: 16, opacity: 0.85 }}>
            {nameA} & {nameB}
          </div>
          <div style={{ position: "relative", marginTop: 28, display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 28px", borderRadius: 99, background: S[1].ac, color: S[1].bg, fontWeight: 800, fontSize: 17, animation: "rsPulse 1.8s ease-in-out infinite" }}>
            <Heart size={16} fill="currentColor" /> Toque para abrir
          </div>
        </button>
      )}
    </div>
  );
}

// ───────── seções ─────────
function CounterSection({ sw, days, year, startDate }: { sw: Swatch; days: NonNullable<ReturnType<typeof computeDays>>; year: number; startDate: string }) {
  const [ref, on] = useInView<HTMLElement>();
  const n = useCountUp(days.inYear, on);
  const t = useLiveCounter(startDate);
  const startedThisYear = days.start.getFullYear() === year;
  const since = days.start.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const pad = (x: number) => String(x).padStart(2, "0");
  const box = { background: `${sw.fg}14`, border: `0.4cqw solid ${sw.fg}26`, borderRadius: "3.5cqw" };
  return (
    <Section sw={sw} center blobs={1} innerRef={ref} on={on}>
      <Kicker>{startedThisYear ? `desde ${since}, foram` : `em ${year}, foram`}</Kicker>
      <div className="rs-pop" style={{ ["--d" as string]: "150ms", fontFamily: D_FONT, fontWeight: 800, fontSize: n > 999 ? "34cqw" : "42cqw", lineHeight: 0.9, letterSpacing: "-0.05em", color: sw.ac, marginTop: "4cqw" }}>
        {n}
      </div>
      <Title d={250}>dias juntos</Title>

      {t && (
        <div className="rs-in" style={{ ["--d" as string]: "700ms", marginTop: "9cqw", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: "3.2cqw", fontWeight: 700, letterSpacing: "0.2em", opacity: 0.8, display: "inline-flex", alignItems: "center", gap: "1.5cqw" }}>
            <Calendar size={12} /> JUNTOS DESDE {since.toUpperCase()}
          </div>
          <div style={{ display: "flex", gap: "2.5cqw", marginTop: "3.5cqw" }}>
            {[
              [t.y, t.y === 1 ? "ANO" : "ANOS"],
              [t.mo, t.mo === 1 ? "MÊS" : "MESES"],
              [t.da, t.da === 1 ? "DIA" : "DIAS"],
            ].map(([v, l]) => (
              <div key={l as string} style={{ ...box, minWidth: "19cqw", padding: "3cqw 2cqw" }}>
                <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "9cqw", lineHeight: 1, color: sw.ac2 }}>{v as number}</div>
                <div style={{ fontSize: "2.6cqw", fontWeight: 700, letterSpacing: "0.14em", marginTop: "1.2cqw", opacity: 0.8 }}>{l as string}</div>
              </div>
            ))}
          </div>
          <div style={{ ...box, marginTop: "2.5cqw", padding: "2cqw 5cqw", borderRadius: 99, fontFamily: D_FONT, fontWeight: 600, fontSize: "4.6cqw", letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums" }}>
            {pad(t.h)} : {pad(t.mi)} : {pad(t.se)}
          </div>
          {!startedThisYear && (
            <div style={{ fontSize: "3.8cqw", marginTop: "4cqw", opacity: 0.85 }}>
              São <b style={{ color: sw.ac2 }}>{days.total.toLocaleString("pt-BR")}</b> dias de amor no total ♥
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function TimelineSection({ sw, months, year }: { sw: Swatch; months: { month: number; title: string; photo?: string }[]; year: number }) {
  const [ref, on] = useInView<HTMLElement>();
  return (
    <Section sw={sw} blobs={2} innerRef={ref} on={on}>
      <Kicker>a nossa linha do tempo</Kicker>
      <Title d={120} left>
        {year},
        <br />
        mês a mês
      </Title>
      <div style={{ marginTop: "8cqw" }}>
        {months.map((m, i) => (
          <TimelineItem key={`${m.month}-${i}`} sw={sw} month={m.month} title={m.title} photo={m.photo} last={i === months.length - 1} flip={i % 2 === 1} />
        ))}
      </div>
    </Section>
  );
}

function TimelineItem({ sw, month, title, photo, last, flip }: { sw: Swatch; month: number; title: string; photo?: string; last: boolean; flip: boolean }) {
  const [ref, on] = useInView<HTMLDivElement>();
  const nome = MESES[month] ?? "";
  return (
    <div ref={ref} className={on ? "tl-on" : undefined} style={{ display: "flex", gap: "4cqw" }}>
      {/* trilho */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "10cqw", flexShrink: 0 }}>
        <div
          className="tl-pop"
          style={{ ["--d" as string]: "0ms", width: "10cqw", height: "10cqw", borderRadius: "50%", background: sw.ac, color: sw.bg, display: "grid", placeItems: "center", fontFamily: D_FONT, fontWeight: 800, fontSize: "3.6cqw", letterSpacing: "-0.02em", flexShrink: 0 }}
        >
          {String(month + 1).padStart(2, "0")}
        </div>
        {!last && <div style={{ width: "0.7cqw", flex: 1, minHeight: "6cqw", background: sw.ac, opacity: 0.35, borderRadius: 99, margin: "1.5cqw 0" }} />}
      </div>
      {/* conteúdo */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : "9cqw" }}>
        <div className="tl-in" style={{ ["--d" as string]: "80ms", fontFamily: D_FONT, fontWeight: 800, fontSize: `${Math.min(11, 75 / Math.max(nome.length, 1))}cqw`, lineHeight: 0.95, letterSpacing: "-0.03em", color: sw.ac, marginTop: "0.5cqw", whiteSpace: "nowrap" }}>
          {nome}
        </div>
        {title && (
          <div className="tl-in" style={{ ["--d" as string]: "200ms", fontFamily: D_FONT, fontWeight: 600, fontSize: "5.2cqw", lineHeight: 1.2, marginTop: "1.8cqw" }}>
            {title}
          </div>
        )}
        {photo && (
          <div className="tl-in" style={{ ["--d" as string]: "320ms", marginTop: "4cqw" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt=""
              style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block", borderRadius: "4cqw", border: `1.4cqw solid #fff`, boxShadow: "0 3cqw 7cqw rgba(0,0,0,.22)", transform: `rotate(${flip ? 1.6 : -1.6}deg)` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SongsSection({ sw, songs }: { sw: Swatch; songs: RetroSong[] }) {
  const [ref, on] = useInView<HTMLElement>();
  const [sel, setSel] = useState(() => Math.max(0, songs.findIndex((s) => toEmbed(s.url))));
  const embed = toEmbed(songs[sel]?.url);
  return (
    <Section sw={sw} blobs={0} innerRef={ref} on={on}>
      <Kicker>a trilha sonora do casal</Kicker>
      <Title d={120} left>
        As nossas
        <br />
        músicas
      </Title>
      <div style={{ marginTop: "6cqw", display: "grid", gap: "2cqw" }}>
        {songs.map((s, i) => {
          const [nome, artista] = s.title.split(/\s+-\s+/);
          const playable = !!toEmbed(s.url);
          const ativo = i === sel && playable;
          return (
            <button
              key={i}
              onClick={() => playable && setSel(i)}
              className="rs-in"
              style={{ ["--d" as string]: `${250 + i * 140}ms`, display: "flex", alignItems: "center", gap: "4cqw", textAlign: "left", padding: "2.8cqw 3.5cqw", borderRadius: "3.5cqw", border: "none", cursor: playable ? "pointer" : "default", background: ativo ? `${sw.fg}1f` : "transparent", color: sw.fg, fontFamily: B_FONT }}
            >
              <span style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "9cqw", width: "8cqw", lineHeight: 1, color: i === 0 ? sw.ac2 : sw.fg, opacity: i === 0 ? 1 : 0.65 }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "4.6cqw", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</div>
                {artista && <div style={{ fontSize: "3.5cqw", opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artista}</div>}
              </span>
              {playable && <Music2 size={16} style={{ opacity: ativo ? 1 : 0.5, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
      {embed && (
        <div className="rs-in" style={{ ["--d" as string]: "900ms", marginTop: "5cqw" }}>
          <iframe
            key={embed.src}
            title="música do casal"
            src={embed.src}
            width="100%"
            height={embed.type === "spotify" ? 80 : 180}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            style={{ border: "none", borderRadius: 12, display: "block" }}
          />
        </div>
      )}
    </Section>
  );
}

function StatsSection({ sw, stats }: { sw: Swatch; stats: RetroStat[] }) {
  const [ref, on] = useInView<HTMLElement>();
  return (
    <Section sw={sw} blobs={1} innerRef={ref} on={on}>
      <Kicker>em números</Kicker>
      <Title d={120} left>
        O nosso ano
        <br />
        em números
      </Title>
      <div style={{ marginTop: "7cqw", display: "grid", gap: "4cqw" }}>
        {stats.map((s, i) => (
          <div key={i} className="rs-in" style={{ ["--d" as string]: `${300 + i * 250}ms`, borderTop: `0.5cqw solid ${sw.fg}33`, paddingTop: "4cqw" }}>
            <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "15cqw", lineHeight: 0.95, color: [sw.ac, sw.ac2][i % 2] }}>{s.value}</div>
            <div style={{ fontSize: "4.6cqw", lineHeight: 1.3, fontWeight: 500, marginTop: "1.5cqw" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SummarySection({
  sw, card, year, nameA, nameB, days, songs, stats, cover, slug, compact,
}: {
  sw: Swatch; card: Swatch; year: number; nameA: string; nameB: string;
  days: ReturnType<typeof computeDays>; songs: RetroSong[]; stats: RetroStat[];
  cover?: string; slug?: string; compact: boolean;
}) {
  const [ref, on] = useInView<HTMLElement>();
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/${slug ?? ""}`;
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
    <Section sw={sw} center blobs={2} innerRef={ref} on={on}>
      <Kicker>o nosso resumo</Kicker>
      <div
        className="rs-pop"
        style={{ ["--d" as string]: "150ms", marginTop: "6cqw", width: "100%", borderRadius: "5cqw", overflow: "hidden", background: card.bg, color: card.fg, boxShadow: "0 4cqw 12cqw rgba(0,0,0,.35)", textAlign: "left" }}
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
            <div style={{ fontSize: "3cqw", fontWeight: 700, letterSpacing: "0.22em", opacity: 0.85 }}>NOSSO</div>
            <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "15cqw", lineHeight: 0.85, color: card.ac2 }}>{year}</div>
            <div style={{ fontFamily: D_FONT, fontWeight: 700, fontSize: "4.6cqw", marginTop: "1.5cqw", lineHeight: 1.1 }}>
              {nameA} & {nameB}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: songs.length ? "1fr 1fr" : "1fr", gap: "4cqw", padding: "0 5cqw 5cqw" }}>
          {songs.length > 0 && (
            <div>
              <div style={{ fontSize: "2.8cqw", fontWeight: 700, letterSpacing: "0.12em", opacity: 0.8, marginBottom: "1.5cqw" }}>NOSSAS MÚSICAS</div>
              {songs.map((s, i) => (
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
                <div style={{ fontSize: "2.8cqw", fontWeight: 700, letterSpacing: "0.12em", opacity: 0.8, lineHeight: 1.25 }}>{c.k}</div>
                <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "8cqw", lineHeight: 1, marginTop: "0.8cqw" }}>{c.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3cqw 5cqw", background: `${card.fg}14`, fontSize: "3cqw", fontWeight: 700 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "1.5cqw" }}>
            <Heart size={11} fill={card.fg} color={card.fg} /> FromMyHeart
          </span>
          <span style={{ opacity: 0.8 }}>retrospectiva do casal</span>
        </div>
      </div>
      <div className="rs-in" style={{ ["--d" as string]: "400ms", display: "flex", alignItems: "center", gap: "2cqw", marginTop: "5cqw", fontSize: "3.8cqw", fontWeight: 600 }}>
        <Camera size={15} /> Tira um print e posta no story
      </div>
      {slug && !compact && (
        <button
          onClick={share}
          className="rs-in"
          style={{ ["--d" as string]: "550ms", marginTop: "3.5cqw", display: "inline-flex", alignItems: "center", gap: "2cqw", padding: "3cqw 6cqw", borderRadius: 99, border: "none", background: sw.fg, color: sw.bg, fontWeight: 700, fontSize: "3.8cqw", cursor: "pointer", fontFamily: B_FONT }}
        >
          <Share2 size={14} /> {copied ? "Link copiado!" : "Compartilhar"}
        </button>
      )}
    </Section>
  );
}

// ───────── peças de UI ─────────
function Section({
  sw, children, center, minH, blobs = 0, innerRef, on,
}: {
  sw: Swatch; children: React.ReactNode; center?: boolean; minH?: number | string; blobs?: number;
  innerRef?: React.Ref<HTMLElement>; on?: boolean;
}) {
  // seções sem "innerRef" próprio (abertura, mensagem, final) observam a si mesmas
  const [selfRef, selfOn] = useInView<HTMLElement>();
  const ref = innerRef ?? selfRef;
  const visible = on ?? selfOn;
  return (
    <section
      ref={ref}
      className={visible ? "on" : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
        background: sw.bg,
        color: sw.fg,
        minHeight: minH,
        padding: "16cqw 7cqw",
        display: "flex",
        flexDirection: "column",
        alignItems: center ? "center" : "stretch",
        justifyContent: "center",
        textAlign: center ? "center" : "left",
      }}
    >
      <Blobs sw={sw} variant={blobs} />
      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: center ? "center" : "stretch" }}>{children}</div>
    </section>
  );
}
function Kicker({ children, d = 0 }: { children: React.ReactNode; d?: number }) {
  return (
    <div className="rs-in" style={{ ["--d" as string]: `${d}ms`, fontSize: "3.4cqw", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.85 }}>
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

// manchas grandes e borradas no fundo — dão movimento sem distrair
function Blobs({ sw, variant }: { sw: Swatch; variant: number }) {
  const pos = [
    [{ t: -12, l: -25, s: 85 }, { t: 60, l: 55, s: 75 }],
    [{ t: 55, l: -30, s: 80 }, { t: -10, l: 50, s: 70 }],
    [{ t: -8, l: 45, s: 90 }, { t: 70, l: -20, s: 65 }],
  ][variant % 3];
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pos.map((p, i) => (
        <div
          key={i}
          className="rs-blob"
          style={{
            position: "absolute",
            top: `${p.t}%`,
            left: `${p.l}%`,
            width: `${p.s}cqw`,
            height: `${p.s}cqw`,
            borderRadius: "50%",
            background: i ? sw.ac2 : sw.ac,
            opacity: 0.25,
            filter: "blur(12cqw)",
            animation: `rsFloat ${9 + i * 3}s ease-in-out ${i * -2}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

// Animações de entrada: tudo com .rs-in/.rs-pop fica escondido até a seção
// (ou o item da linha do tempo) ganhar a classe "on" ao aparecer na tela.
const CSS = `
@keyframes rsFloat { from { transform: translate(0,0) scale(1) } to { transform: translate(8cqw,6cqw) scale(1.15) } }
@keyframes rsPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
@keyframes rsBounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(1.5cqw) } }
.rs-in, .rs-pop { opacity: 0; transition: opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1); transition-delay: var(--d, 0ms); }
.rs-in { transform: translateY(5cqw); }
.rs-pop { transform: scale(.75); }
.on .rs-in, .on .rs-pop { opacity: 1; transform: none; }
.tl-in, .tl-pop { opacity: 0; transition: opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1); transition-delay: var(--d, 0ms); }
.tl-in { transform: translateY(5cqw); }
.tl-pop { transform: scale(.5); }
.tl-on .tl-in, .tl-on .tl-pop { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .rs-in, .rs-pop, .tl-in, .tl-pop { transition: none !important; opacity: 1 !important; transform: none !important; }
  .rs-blob { animation: none !important; }
}
`;

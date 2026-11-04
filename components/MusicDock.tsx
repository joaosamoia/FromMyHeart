"use client";

// components/MusicDock.tsx
// Mini-player fixo no rodapé da Retrospectiva, no estilo do Spotify: capa,
// nome da música, botão verde redondo de play/pause e barra de progresso.
// A música NÃO toca sozinha: a pessoa decide se quer dar play.
//
// Por baixo, quem toca é o player oficial (Spotify iFrame API ou YouTube
// IFrame API), escondido. O nosso botão comanda ele. Se o navegador não deixar
// tocar pelo nosso botão (acontece em alguns iPhones com iframe), em 2,5 s o
// player oficial aparece e a pessoa toca no ▶ dele — nunca fica sem música.
//
// Limitações que não dependem da gente:
//   • Spotify: quem não está logado no Spotify naquele navegador ouve só a
//     prévia de 30s da música. Com YouTube toca a música inteira.

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Music2 } from "lucide-react";

export type MusicApi = { play: () => void };

type SpotifyController = { play: () => void; togglePlay: () => void; pause?: () => void; resume?: () => void; addListener: (ev: string, cb: (e: { data: { isPaused: boolean; position?: number; duration?: number } }) => void) => void };
type YTPlayer = { playVideo: () => void; pauseVideo: () => void; getCurrentTime?: () => number; getDuration?: () => number };
type YTStateEvent = { data: number };

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
    __spotifyIframeApi?: SpotifyIFrameAPI;
    __spotifyIframeWaiters?: ((api: SpotifyIFrameAPI) => void)[];
    YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
    __ytWaiters?: (() => void)[];
  }
}
type SpotifyIFrameAPI = { createController: (el: HTMLElement, opts: Record<string, unknown>, cb: (c: SpotifyController) => void) => void };

// Entende os formatos de link que as pessoas costumam colar:
//   Spotify: open.spotify.com/track/ID, open.spotify.com/intl-pt/track/ID, spotify:track:ID
//   YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID,
//            m.youtube.com/…, music.youtube.com/watch?v=ID, youtube.com/live/ID
// Links encurtados do Spotify (spotify.link/…) não dá pra ler sem abrir — o quiz avisa.
export function parseMusic(url?: string): { kind: "spotify"; id: string } | { kind: "youtube"; id: string } | null {
  if (!url) return null;
  const u = url.trim();
  const sp = u.match(/spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{10,})/) || u.match(/^spotify:track:([A-Za-z0-9]{10,})/);
  if (sp) return { kind: "spotify", id: sp[1] };
  const yt =
    u.match(/youtu\.be\/([\w-]{11})/) ||
    u.match(/youtube\.com\/(?:shorts|live|embed)\/([\w-]{11})/) ||
    u.match(/youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/);
  if (yt) return { kind: "youtube", id: yt[1] };
  return null;
}

// Diagnóstico pro quiz: diz o que está errado com o link, em português.
export function musicLinkStatus(url?: string): { ok: boolean; msg: string } | null {
  const u = (url ?? "").trim();
  if (!u) return null;
  const m = parseMusic(u);
  if (m) return { ok: true, msg: m.kind === "spotify" ? "Link do Spotify reconhecido" : "Link do YouTube reconhecido" };
  if (/spotify\.link|spoti\.fi/.test(u)) return { ok: false, msg: "Esse é um link encurtado do Spotify. Abra ele no navegador e copie o endereço completo (open.spotify.com/track/…)." };
  if (/spotify\.com\/(album|playlist|artist)/.test(u)) return { ok: false, msg: "Esse link é de álbum/playlist. Abra a MÚSICA e copie o link dela." };
  if (/youtube|youtu\.be/.test(u)) return { ok: false, msg: "Não achei o vídeo nesse link do YouTube. Copie o link pelo botão Compartilhar do vídeo." };
  return { ok: false, msg: "Não reconheci esse link. Use um link de música do Spotify ou do YouTube." };
}

export function embedSrc(url?: string) {
  const m = parseMusic(url);
  if (!m) return null;
  return m.kind === "spotify" ? `https://open.spotify.com/embed/track/${m.id}?utm_source=generator` : `https://www.youtube.com/embed/${m.id}`;
}

function loadScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  document.body.appendChild(s);
}

function onSpotifyApi(cb: (api: SpotifyIFrameAPI) => void) {
  if (window.__spotifyIframeApi) return cb(window.__spotifyIframeApi);
  (window.__spotifyIframeWaiters ??= []).push(cb);
  window.onSpotifyIframeApiReady = (api) => {
    window.__spotifyIframeApi = api;
    (window.__spotifyIframeWaiters ?? []).forEach((w) => w(api));
    window.__spotifyIframeWaiters = [];
  };
  loadScript("https://open.spotify.com/embed/iframe-api/v1");
}

function onYouTubeApi(cb: () => void) {
  if (window.YT?.Player) return cb();
  (window.__ytWaiters ??= []).push(cb);
  window.onYouTubeIframeAPIReady = () => {
    (window.__ytWaiters ?? []).forEach((w) => w());
    window.__ytWaiters = [];
  };
  loadScript("https://www.youtube.com/iframe_api");
}

const VERDE = "#1ED760";

function separar(title: string): [string, string] {
  const [m, ...rest] = title.split(/\s[-–—]\s/);
  return [m?.trim() || "a nossa música", rest.join(" - ").trim()];
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function MusicDock({
  url,
  title,
  apiRef,
  capa,
}: {
  url?: string;
  title: string;
  apiRef: React.MutableRefObject<MusicApi | null>;
  capa?: string;
  look?: unknown; // mantido por compatibilidade com quem já passa o tema
}) {
  const music = parseMusic(url);
  const host = useRef<HTMLDivElement>(null);
  const spotify = useRef<SpotifyController | null>(null);
  const yt = useRef<YTPlayer | null>(null);
  const [pronto, setPronto] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [jaTocou, setJaTocou] = useState(false);
  const [mostrarOficial, setMostrarOficial] = useState(false);
  const [min, setMin] = useState(false);
  const [pos, setPos] = useState({ t: 0, d: 0 });
  const timer = useRef<number | undefined>(undefined);
  const kind = music?.kind;
  const id = music?.id;

  useEffect(() => {
    if (!kind || !id || !host.current) return;
    const el = document.createElement("div");
    host.current.innerHTML = "";
    host.current.appendChild(el);
    let alive = true;
    let poll: number | undefined;

    const marcar = (tocando: boolean) => {
      setPlaying(tocando);
      if (tocando) {
        setJaTocou(true);
        window.clearTimeout(timer.current);
      }
    };

    if (kind === "spotify") {
      onSpotifyApi((IFrameAPI) => {
        if (!alive) return;
        IFrameAPI.createController(el, { uri: `spotify:track:${id}`, width: "100%", height: 80 }, (c) => {
          spotify.current = c;
          setPronto(true);
          c.addListener("playback_update", (e) => {
            marcar(!e.data.isPaused);
            if (e.data.duration) setPos({ t: (e.data.position ?? 0) / 1000, d: e.data.duration / 1000 });
          });
        });
      });
    } else {
      onYouTubeApi(() => {
        if (!alive || !window.YT) return;
        new window.YT.Player(el, {
          videoId: id,
          width: 200,
          height: 112,
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: (e: { target: YTPlayer }) => {
              yt.current = e.target;
              setPronto(true);
            },
            onStateChange: (e: YTStateEvent) => marcar(e.data === 1),
          },
        });
      });
      poll = window.setInterval(() => {
        const p = yt.current;
        if (p?.getDuration) setPos({ t: p.getCurrentTime?.() ?? 0, d: p.getDuration() || 0 });
      }, 1000);
    }

    apiRef.current = { play: () => spotify.current?.play() ?? yt.current?.playVideo() };
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.clearTimeout(timer.current);
      apiRef.current = null;
      spotify.current = null;
      yt.current = null;
    };
  }, [kind, id, apiRef]);

  const [nome, artista] = separar(title);
  // Sem link que dê pra tocar (a pessoa só escreveu o nome da música): em vez
  // de sumir com o player, o botão verde abre a música no Spotify.
  if (!music) {
    if (!title.trim()) return null;
    return (
      <div style={{ position: "fixed", left: "50%", bottom: 12, transform: "translateX(-50%)", width: "calc(100% - 20px)", maxWidth: 460, zIndex: 30, background: "#181818", color: "#fff", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,.45)", fontFamily: "Inter, system-ui, sans-serif", display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#282828", display: "grid", placeItems: "center" }}>
          {capa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capa} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Music2 size={20} color={VERDE} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</div>
          <div style={{ fontSize: 12.5, color: "#b3b3b3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{artista || "a nossa música ♥"}</div>
        </div>
        <a
          href={`https://open.spotify.com/search/${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ouvir a nossa música no Spotify"
          style={{ width: 46, height: 46, borderRadius: "50%", background: VERDE, display: "grid", placeItems: "center", flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden style={{ marginLeft: 3 }}>
            <path d="M6 4.2v15.6a1 1 0 0 0 1.5.86l13-7.8a1 1 0 0 0 0-1.72l-13-7.8A1 1 0 0 0 6 4.2Z" fill="#000" />
          </svg>
        </a>
      </div>
    );
  }

  const alternar = () => {
    if (playing) {
      if (spotify.current) spotify.current.togglePlay();
      else yt.current?.pauseVideo();
      return;
    }
    if (spotify.current) spotify.current.togglePlay();
    else yt.current?.playVideo();
    // se em 2,5 s não começou, mostra o player oficial pra pessoa tocar nele
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMostrarOficial(true), 2500);
  };

  const pct = pos.d ? Math.min(100, (pos.t / pos.d) * 100) : 0;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 12,
        transform: `translateX(-50%) translateY(${min ? "calc(100% - 22px)" : "0"})`,
        transition: "transform .4s ease",
        width: "calc(100% - 20px)",
        maxWidth: 460,
        zIndex: 30,
        background: "#181818",
        color: "#fff",
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,.45)",
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <style>{`@keyframes mdSpin{to{transform:rotate(360deg)}} @keyframes mdBar{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}} .md-eq span{display:inline-block;width:3px;height:12px;margin-right:2px;background:${VERDE};border-radius:1px;transform-origin:bottom;animation:mdBar .9s ease-in-out infinite} .md-eq span:nth-child(2){animation-delay:.2s} .md-eq span:nth-child(3){animation-delay:.4s} .md-play:active{transform:scale(.94)}`}</style>

      <button onClick={() => setMin((m) => !m)} aria-label={min ? "Mostrar player" : "Esconder player"} style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", width: 44, height: 14, border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "grid", placeItems: "center", color: "#8a8a8a", zIndex: 2 }}>
        {min ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 12px 12px" }}>
        <div style={{ width: 48, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#282828", display: "grid", placeItems: "center" }}>
          {capa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capa} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", animation: playing ? "mdSpin 9s linear infinite" : undefined, borderRadius: playing ? "50%" : 0, transition: "border-radius .4s" }} />
          ) : (
            <Music2 size={20} color={VERDE} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {playing && (
              <span className="md-eq" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            )}
            <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: playing ? VERDE : "#fff" }}>{nome}</div>
          </div>
          <div style={{ fontSize: 12.5, color: "#b3b3b3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
            {artista || (jaTocou ? "a nossa música ♥" : "toque no play pra ouvir a nossa música ♥")}
          </div>
        </div>
        <button
          className="md-play"
          onClick={alternar}
          disabled={!pronto}
          aria-label={playing ? "Pausar" : "Tocar a nossa música"}
          style={{ width: 46, height: 46, borderRadius: "50%", border: "none", background: VERDE, display: "grid", placeItems: "center", cursor: pronto ? "pointer" : "default", opacity: pronto ? 1 : 0.6, flexShrink: 0, transition: "transform .1s", boxShadow: "0 6px 16px rgba(30,215,96,.25)" }}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <rect x="5" y="4" width="4.5" height="16" rx="1.2" fill="#000" />
              <rect x="14.5" y="4" width="4.5" height="16" rx="1.2" fill="#000" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden style={{ marginLeft: 3 }}>
              <path d="M6 4.2v15.6a1 1 0 0 0 1.5.86l13-7.8a1 1 0 0 0 0-1.72l-13-7.8A1 1 0 0 0 6 4.2Z" fill="#000" />
            </svg>
          )}
        </button>
      </div>

      {/* barra de progresso */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 10px", fontSize: 10.5, color: "#a7a7a7", fontVariantNumeric: "tabular-nums" }}>
        <span style={{ width: 34, textAlign: "right", whiteSpace: "nowrap" }}>{mmss(pos.t)}</span>
        <div style={{ flex: 1, height: 4, borderRadius: 99, background: "#4d4d4d", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: playing ? VERDE : "#fff", borderRadius: 99, transition: "width .9s linear" }} />
        </div>
        <span style={{ width: 34, whiteSpace: "nowrap" }}>{pos.d ? mmss(pos.d) : "0:30"}</span>
      </div>

      {mostrarOficial && !playing && (
        <div style={{ margin: "0 12px 8px", fontSize: 12.5, color: "#fff", textAlign: "center" }}>
          seu celular pediu um toque a mais: dá o play ▶ no player aqui embaixo ♥
        </div>
      )}
      {/* player oficial: escondido; aparece só se o nosso botão não conseguir tocar */}
      <div
        ref={host}
        aria-hidden={!mostrarOficial}
        style={
          mostrarOficial && !jaTocou
            ? { padding: "0 10px 10px", minHeight: music.kind === "spotify" ? 80 : 112 }
            : { position: "absolute", width: 300, height: 120, left: -9999, top: 0, opacity: 0, pointerEvents: "none" }
        }
      />
    </div>
  );
}

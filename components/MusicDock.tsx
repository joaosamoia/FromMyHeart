"use client";

// components/MusicDock.tsx
// Player fixo no rodapé da Retrospectiva, com a música nº 1 do casal.
//
// A ideia é ela começar a tocar no instante em que a pessoa toca em
// "toque para abrir". Navegadores só deixam tocar som depois de um toque do
// usuário — e o toque na capa É esse toque. Por isso a capa chama
// `apiRef.current.play()` direto no onClick (não dentro de um efeito).
//
// Funciona com link do Spotify (via Spotify iFrame API) e do YouTube (via
// YouTube IFrame API). O player fica visível (nada de áudio "escondido") e dá
// pra pausar/minimizar.
//
// Limitações que não dependem da gente:
//   • Spotify: quem não está logado no Spotify naquele navegador ouve só a
//     prévia de 30s da música. Com YouTube toca a música inteira.
//   • Alguns iPhones bloqueiam o play automático dentro de iframe mesmo após o
//     toque — nesse caso a pessoa só precisa tocar no play do player.

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Music2 } from "lucide-react";

export type MusicApi = { play: () => void };

type SpotifyController = { play: () => void; togglePlay: () => void; addListener: (ev: string, cb: (e: { data: { isPaused: boolean } }) => void) => void };
type YTPlayer = { playVideo: () => void; pauseVideo: () => void };
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

export default function MusicDock({
  url,
  title,
  apiRef,
  look,
}: {
  url?: string;
  title: string;
  apiRef: React.MutableRefObject<MusicApi | null>;
  look: { bg: string; fg: string; ac: string; font: string; radius?: number };
}) {
  const music = parseMusic(url);
  const host = useRef<HTMLDivElement>(null);
  const spotify = useRef<SpotifyController | null>(null);
  const yt = useRef<YTPlayer | null>(null);
  const wantPlay = useRef(false);
  const [min, setMin] = useState(false);
  const [playing, setPlaying] = useState(false);
  // se o navegador bloquear o play automático, mostramos um aviso pra tocar no ▶
  const [needTap, setNeedTap] = useState(false);
  const kind = music?.kind;
  const id = music?.id;

  useEffect(() => {
    if (!kind || !id || !host.current) return;
    const el = document.createElement("div");
    host.current.innerHTML = "";
    host.current.appendChild(el);
    let alive = true;

    if (kind === "spotify") {
      onSpotifyApi((IFrameAPI) => {
        if (!alive) return;
        IFrameAPI.createController(el, { uri: `spotify:track:${id}`, width: "100%", height: 80 }, (c) => {
          spotify.current = c;
          c.addListener("playback_update", (e) => {
            const tocando = !e.data.isPaused;
            setPlaying(tocando);
            if (tocando) setNeedTap(false);
          });
          if (wantPlay.current) c.play();
        });
      });
    } else {
      onYouTubeApi(() => {
        if (!alive || !window.YT) return;
        new window.YT.Player(el, {
          videoId: id,
          width: 128,
          height: 72,
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: (e: { target: YTPlayer }) => {
              yt.current = e.target;
              if (wantPlay.current) e.target.playVideo();
            },
            onStateChange: (e: YTStateEvent) => {
              const tocando = e.data === 1; // 1 = tocando
              setPlaying(tocando);
              if (tocando) setNeedTap(false);
            },
          },
        });
      });
    }

    let checkTimer: number | undefined;
    apiRef.current = {
      play: () => {
        wantPlay.current = true;
        spotify.current?.play();
        yt.current?.playVideo();
        // 3,5s depois, se ainda não começou, pede um toque no ▶ (iPhone e alguns
        // navegadores não deixam o iframe tocar sozinho)
        window.clearTimeout(checkTimer);
        checkTimer = window.setTimeout(() => {
          setPlaying((p) => {
            if (!p) {
              setNeedTap(true);
              setMin(false);
            }
            return p;
          });
        }, 3500);
      },
    };
    return () => {
      window.clearTimeout(checkTimer);
      alive = false;
      apiRef.current = null;
      spotify.current = null;
      yt.current = null;
    };
  }, [kind, id, apiRef]);

  if (!music) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 12,
        transform: `translateX(-50%) translateY(${min ? "calc(100% - 40px)" : "0"})`,
        transition: "transform .4s ease",
        width: "calc(100% - 24px)",
        maxWidth: 456,
        zIndex: 30,
        background: look.bg,
        color: look.fg,
        borderRadius: look.radius ?? 16,
        boxShadow: "0 10px 30px rgba(0,0,0,.28)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setMin((m) => !m)}
        aria-label={min ? "Mostrar player" : "Minimizar player"}
        style={{ width: "100%", height: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", border: "none", background: "transparent", color: look.fg, cursor: "pointer", fontFamily: look.font, fontSize: 15, textAlign: "left" }}
      >
        <Music2 size={15} color={look.ac} className={playing ? "md-spin" : undefined} />
        <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {playing ? "tocando agora" : "nossa música"}: <b>{title}</b>
        </span>
        {min ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {needTap && !playing && (
        <div style={{ margin: "0 10px 8px", padding: "8px 12px", borderRadius: 8, background: look.ac, color: "#fff", fontFamily: look.font, fontSize: 15, textAlign: "center", animation: "mdPulse 1.4s ease-in-out infinite" }}>
          toque no ▶ aqui embaixo pra ouvir a nossa música ♥
        </div>
      )}
      <style>{`@keyframes mdPulse{0%,100%{opacity:1}50%{opacity:.75}} @keyframes mdSpin{to{transform:rotate(360deg)}} .md-spin{animation:mdSpin 2.4s linear infinite}`}</style>
      <div ref={host} style={{ padding: music.kind === "spotify" ? "0 8px 8px" : "0 10px 10px", minHeight: music.kind === "spotify" ? 80 : 72 }} />
    </div>
  );
}

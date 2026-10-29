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

export function parseMusic(url?: string): { kind: "spotify"; id: string } | { kind: "youtube"; id: string } | null {
  if (!url) return null;
  try {
    if (url.includes("spotify.com")) {
      const id = url.split("/track/")[1]?.split("?")[0];
      if (id) return { kind: "spotify", id };
    }
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const id = url.includes("youtu.be")
        ? url.split("youtu.be/")[1]?.split("?")[0]
        : new URLSearchParams(url.split("?")[1] ?? "").get("v");
      if (id) return { kind: "youtube", id };
    }
  } catch {}
  return null;
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
          },
        });
      });
    }

    apiRef.current = {
      play: () => {
        wantPlay.current = true;
        spotify.current?.play();
        yt.current?.playVideo();
      },
    };
    return () => {
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
        <Music2 size={15} color={look.ac} />
        <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          tocando agora: <b>{title}</b>
        </span>
        {min ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <div ref={host} style={{ padding: music.kind === "spotify" ? "0 8px 8px" : "0 10px 10px", minHeight: music.kind === "spotify" ? 80 : 72 }} />
    </div>
  );
}

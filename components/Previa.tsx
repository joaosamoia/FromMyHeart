"use client";

// components/Previa.tsx
// Casca da prévia (/previa): a retrospectiva da pessoa até a linha do tempo,
// marca d'água "PRÉVIA" por cima, barra fixa no topo com o botão de liberar e,
// no lugar do resto da página, o "cadeado" listando o que ficou trancado.

import { Lock, Heart, Music2, Hash, Sparkles, Mail, Ticket, ArrowRight, CalendarHeart } from "lucide-react";
import RetroStories from "@/components/RetroStories";
import { BR, D_FONT } from "@/components/brand";
import { track } from "@/lib/funil";
import type { CouplePageDoc } from "@/types/page";
import type { Trancado } from "@/lib/previa";

type Props = {
  page: Partial<CouplePageDoc>;
  trancado: Trancado;
  href: string; // pra onde vai o botão (checkout ou "terminar o rascunho")
  rotulo: string; // texto do botão
  preco?: string; // "R$ 29,90" (só quando o botão vai direto pro pagamento)
  linkFinal?: string; // "datecriativo.fun/joao-e-maria"
};

// marca d'água em SVG repetido (leve, não atrapalha a leitura)
const MARCA = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='200'><text x='130' y='110' text-anchor='middle' transform='rotate(-28 130 100)' font-family='Arial, sans-serif' font-size='30' font-weight='800' letter-spacing='6' fill='#000' fill-opacity='0.10'>PRÉVIA</text><text x='130' y='110' text-anchor='middle' transform='rotate(-28 130 100) translate(1.5 1.5)' font-family='Arial, sans-serif' font-size='30' font-weight='800' letter-spacing='6' fill='#fff' fill-opacity='0.10'>PRÉVIA</text></svg>`
)}")`;

export default function Previa({ page, trancado, href, rotulo, preco, linkFinal }: Props) {
  const clicou = () => track("retro", "previa_cta");
  const ano = (page.retroYear || new Date().getFullYear()) + 1;

  const itens = [
    trancado.meses > 0 && { Icon: CalendarHeart, t: `+${trancado.meses} ${trancado.meses === 1 ? "momento" : "momentos"} na linha do tempo` },
    trancado.musicas > 0 && { Icon: Music2, t: trancado.musicas > 1 ? `O top ${Math.min(5, trancado.musicas)} de músicas de vocês` : "A música de vocês" },
    trancado.numeros > 0 && { Icon: Hash, t: `${Math.min(5, trancado.numeros)} números do casal` },
    trancado.promessas > 0 && { Icon: Sparkles, t: `${Math.min(5, trancado.promessas)} ${trancado.promessas === 1 ? "promessa" : "promessas"} pra ${ano}` },
    trancado.carta && { Icon: Mail, t: "A sua carta" },
    { Icon: Heart, t: "O card pra print e compartilhar" },
    trancado.vale && { Icon: Ticket, t: "O vale-date do final" },
  ].filter(Boolean) as { Icon: typeof Lock; t: string }[];

  const botao = (grande: boolean) => (
    <a
      href={href}
      onClick={clicou}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: grande ? "100%" : "auto",
        padding: grande ? "16px 18px" : "9px 14px",
        borderRadius: grande ? 16 : 99,
        background: BR.pink,
        color: "#fff",
        fontFamily: grande ? D_FONT : "Inter, system-ui, sans-serif",
        fontWeight: 800,
        fontSize: grande ? 17 : 13,
        textDecoration: "none",
        boxShadow: grande ? `0 5px 0 ${BR.wine}` : "none",
        whiteSpace: "nowrap",
      }}
    >
      {rotulo} <ArrowRight size={grande ? 18 : 15} />
    </a>
  );

  const cadeado = (
    <section style={{ position: "relative", background: BR.wine, color: BR.cream, padding: "56px 22px 72px", overflow: "hidden" }}>
      {/* "conteúdo" borrado de fundo, só pra dar a sensação de que tem mais coisa ali */}
      <div aria-hidden style={{ position: "absolute", inset: 0, filter: "blur(16px)", opacity: 0.3 }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{ height: i % 3 === 0 ? 120 : 34, margin: "22px 26px", borderRadius: 18, background: [BR.pink, BR.orange, BR.yellow, BR.plum][i % 4], width: `${60 + ((i * 17) % 35)}%` }} />
        ))}
      </div>

      <div style={{ position: "relative", maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: BR.pink, display: "grid", placeItems: "center", margin: "0 auto 16px", boxShadow: `0 0 0 8px rgba(232,51,109,.25)` }}>
          <Lock size={28} color="#fff" />
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: BR.yellow }}>gostou até aqui?</div>
        <h2 style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: 30, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "8px 0 10px" }}>
          O resto da retrospectiva está guardado
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: BR.blush, margin: "0 0 22px" }}>
          Tudo o que você escreveu está salvo. Falta só liberar pra mandar o link{page.retroNameB?.trim() ? <> pra <b style={{ color: "#fff" }}>{page.retroNameB.trim()}</b></> : null}.
        </p>

        <div style={{ textAlign: "left", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 18, padding: "6px 16px", marginBottom: 22 }}>
          {itens.map(({ Icon, t }, i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i ? "1px solid rgba(255,255,255,.10)" : "none", fontSize: 15, fontWeight: 600 }}>
              <Icon size={18} color={BR.pinkHot} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t}</span>
              <Lock size={14} color={BR.muted} />
            </div>
          ))}
        </div>

        {botao(true)}
        {preco && (
          <div style={{ marginTop: 12, fontSize: 13, color: BR.blush }}>
            <b style={{ color: "#fff" }}>{preco}</b> · pagamento único · liberação na hora
          </div>
        )}
        {linkFinal && (
          <div style={{ marginTop: 14, fontSize: 12.5, color: BR.muted, lineHeight: 1.5 }}>
            Depois de liberar, o link fica limpo, sem marca d&apos;água:
            <br />
            <b style={{ color: BR.cream }}>{linkFinal}</b>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <>
      <RetroStories page={page} corte={cadeado} />

      {/* marca d'água por cima de tudo (não bloqueia toque nem rolagem) */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none", backgroundImage: MARCA, backgroundRepeat: "repeat" }} />

      {/* barra fixa no topo */}
      <div
        style={{
          position: "fixed",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          width: "min(500px, calc(100% - 20px))",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 7px 7px 14px",
          borderRadius: 99,
          background: "rgba(43,11,63,.92)",
          backdropFilter: "blur(8px)",
          color: BR.cream,
          fontFamily: "Inter, system-ui, sans-serif",
          boxShadow: "0 6px 24px rgba(0,0,0,.25)",
        }}
      >
        <Lock size={14} color={BR.yellow} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.25 }}>
          <b>Prévia</b> · ainda não liberada
        </span>
        {botao(false)}
      </div>
    </>
  );
}

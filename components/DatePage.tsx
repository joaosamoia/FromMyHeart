"use client";

import { useState, useRef } from "react";

export type DateTemplateId = "sunset" | "docinho";

type Tokens = {
  nome: string; descricao: string; bg: string; cardBg: string; cardBorder: string;
  cardShadow: string; fieldBg: string; text: string; muted: string; accent: string;
  accentSoft: string; btnBg: string; btnText: string; btnShadow: string; radius: number;
  btnRadius: number; font: string; titleUpper: boolean; titleWeight: number;
  titleSpacing: number; titleShadow: string; optionCols: number; colorScheme: "dark" | "light";
  emojiHero: string; emojiSim: string; emojiFim: string; confete: string[]; coracao: string;
  heroImg?: string; simImg?: string; sadImg?: string;
  // true = as imagens são prints (têm fundo sólido). O modo de mesclagem
  // "multiply" some com fundos claros sobre o laranja. Depois de recortar o
  // fundo de verdade (remove.bg), troque para false.
  imgComFundo?: boolean;
};

export const DATE_TEMPLATES: Record<DateTemplateId, Tokens> = {
  sunset: {
    nome: "Pôr do sol", descricao: "Laranja quente, pinguim e caixa alta",
    bg: "radial-gradient(120% 120% at 50% 0%, #FF6A2B 0%, #F94C12 55%, #E03A07 100%)",
    cardBg: "rgba(28,10,4,.62)", cardBorder: "rgba(255,120,60,.35)",
    cardShadow: "0 18px 40px rgba(0,0,0,.32)", fieldBg: "rgba(20,6,2,.6)",
    text: "#FFF4EE", muted: "#FFD9C7", accent: "#FF5A1F", accentSoft: "rgba(255,120,60,.22)",
    btnBg: "linear-gradient(180deg,#FF7A3D,#FF5A1F)", btnText: "#fff",
    btnShadow: "0 10px 22px rgba(255,90,31,.5)", radius: 22, btnRadius: 40,
    font: "'Trebuchet MS','Segoe UI',system-ui,sans-serif", titleUpper: true,
    titleWeight: 800, titleSpacing: 0.4, titleShadow: "0 2px 0 rgba(0,0,0,.35)",
    optionCols: 3, colorScheme: "dark",
    emojiHero: "🐧", emojiSim: "🥰", emojiFim: "🐧",
    confete: ["💙", "🖤", "🤎", "❤️", "💜"], coracao: "💙",
    heroImg: "/date/penguin-flower.png", simImg: "/date/flirty-rose.png", sadImg: "/date/sad-please.png",
    imgComFundo: true,
  },
  docinho: {
    nome: "Docinho", descricao: "Pastel claro, ursinho e clima fofo",
    bg: "linear-gradient(180deg, #F6EEFF 0%, #FDF2F8 55%, #EAFBF3 100%)",
    cardBg: "#ffffff", cardBorder: "rgba(160,120,220,.22)",
    cardShadow: "0 14px 34px rgba(150,110,200,.18)", fieldBg: "#FBF7FF",
    text: "#3B2A52", muted: "#8B7BA6", accent: "#A97BE8", accentSoft: "rgba(169,123,232,.16)",
    btnBg: "linear-gradient(180deg,#C79BF5,#A97BE8)", btnText: "#fff",
    btnShadow: "0 10px 22px rgba(169,123,232,.4)", radius: 26, btnRadius: 99,
    font: "'DM Sans','Segoe UI',system-ui,sans-serif", titleUpper: false,
    titleWeight: 700, titleSpacing: -0.3, titleShadow: "none",
    optionCols: 2, colorScheme: "light",
    emojiHero: "🧸", emojiSim: "🌷", emojiFim: "🧸",
    confete: ["💜", "🩷", "🤍", "🌸", "✨"], coracao: "💜",
  },
};

export default function DatePage({
  whatsapp, nickname, big = false, template = "sunset",
}: { whatsapp?: string; nickname?: string; big?: boolean; template?: DateTemplateId }) {
  const T = DATE_TEMPLATES[template] ?? DATE_TEMPLATES.sunset;
  const wa = whatsapp && whatsapp.replace(/\D/g, "").length >= 10 ? whatsapp.replace(/\D/g, "") : "";
  const nick = nickname && nickname.trim() ? nickname.trim() : "amor";
  const nickShow = T.titleUpper ? nick.toUpperCase() : nick;

  const [screen, setScreen] = useState<"s1" | "s2" | "s3" | "s4" | "s5" | "s6">("s1");
  const [food, setFood] = useState<string | null>(null);
  const [vibe, setVibe] = useState<string | null>(null);
  const [dateVal, setDateVal] = useState("");
  const [timeVal, setTimeVal] = useState("");

  const s = big ? 1.12 : 1;
  const confete = Array.from({ length: 14 }, (_, i) => ({
    left: (i * 37) % 100, dur: 6 + ((i * 13) % 6), delay: (i * 7) % 6,
    size: 16 + ((i * 5) % 14), e: T.confete[i % T.confete.length],
  }));

  const foods = [["🍔","Hambúrguer"],["🍣","Sushi"],["🍝","Massas"],["🌮","Tacos"],["🍕","Pizza"],["🍦","Sorvete"]];
  const vibes = [["⛳","Golfe"],["🚶","Caminhada"],["🎬","Cinema"],["💃","Dança"],["🎢","Parque"],["🏖️","Praia"]];
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const fmt = (v: string) => {
    if (!v) return "—";
    const [y, m, dd] = v.split("-");
    return `${parseInt(dd)} de ${meses[parseInt(m) - 1]} de ${y}`;
  };
  const sendZap = () => {
    const msg = `Aceitei nosso date! ${T.coracao}\n\n📅 ${fmt(dateVal)}\n⏰ ${timeVal || "—"}\n🍽️ ${food || "—"}\n✨ ${vibe || "—"}`;
    if (wa) window.open?.("https://wa.me/" + wa + "?text=" + encodeURIComponent(msg), "_blank");
    else alert("O número de WhatsApp não foi configurado nesta página.");
  };

  const h1: React.CSSProperties = {
    fontSize: (big ? 25 : 19) * (T.titleUpper ? 1 : 1.05), fontWeight: T.titleWeight,
    letterSpacing: T.titleSpacing, lineHeight: 1.18, textShadow: T.titleShadow,
    textTransform: T.titleUpper ? "uppercase" : "none", margin: 0, color: T.text,
  };
  const sub: React.CSSProperties = { fontSize: big ? 15 : 13, color: T.muted, fontWeight: 600, margin: "8px 0 0" };
  const card: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: T.cardBg, border: `1px solid ${T.cardBorder}`,
    borderRadius: T.radius, padding: big ? "22px 20px" : "18px 16px", boxShadow: T.cardShadow,
  };
  const btn = (dis?: boolean): React.CSSProperties => ({
    width: "100%", border: "none", cursor: dis ? "default" : "pointer", color: T.btnText,
    fontWeight: 800, letterSpacing: T.titleUpper ? 0.5 : 0.2, fontSize: big ? 17 : 14.5,
    padding: big ? "15px 18px" : "12px 14px", borderRadius: T.btnRadius, fontFamily: "inherit",
    opacity: dis ? 0.5 : 1, background: dis ? T.muted : T.btnBg, boxShadow: dis ? "none" : T.btnShadow,
  });
  const field: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", background: T.fieldBg, border: `1px solid ${T.cardBorder}`,
    borderRadius: 14, padding: "12px 14px", color: T.text, fontSize: 15, fontFamily: "inherit",
    colorScheme: T.colorScheme, outline: "none",
  };
  const fl: React.CSSProperties = { alignSelf: "flex-start", fontSize: 11.5, color: T.muted, fontWeight: 700 };
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: `repeat(${T.optionCols},1fr)`, gap: 8, width: "100%" };
  const opt = (sel: boolean): React.CSSProperties => ({
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    padding: T.optionCols === 2 ? "16px 6px" : "12px 4px", borderRadius: 16, cursor: "pointer",
    background: sel ? T.accentSoft : T.colorScheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
    border: `1.5px solid ${sel ? T.accent : T.cardBorder}`,
    boxShadow: sel ? `0 0 0 3px ${T.accentSoft}` : "none",
  });

  // Personagem grande no topo. Se o template não tiver imagem, cai no emoji —
  // por isso o "docinho" segue funcionando sem precisar de arquivo nenhum.
  const Personagem = ({ src, emoji, tamanho }: { src?: string; emoji: string; tamanho: number }) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={tamanho * s}
        height={tamanho * s}
        style={{
          objectFit: "contain",
          animation: "bobD 3s ease-in-out infinite",
          filter: "drop-shadow(0 10px 16px rgba(0,0,0,.35))",
          ...(T.imgComFundo ? { mixBlendMode: "multiply" as const } : {}),
        }}
      />
    ) : (
      <div style={{ fontSize: tamanho * s, lineHeight: 1, animation: "bobD 3s ease-in-out infinite" }}>{emoji}</div>
    );

  return (
    <div style={{
      minHeight: big ? "100vh" : "100%", background: T.bg, color: T.text, fontFamily: T.font,
      position: "relative", overflowY: "auto", display: "flex", alignItems: "center",
      justifyContent: "center", padding: big ? "40px 22px" : "36px 16px 20px",
    }}>
      <style>{`
        @keyframes floatUpDate{0%{transform:translateY(0) rotate(0) scale(.8);opacity:0}12%{opacity:.9}88%{opacity:.9}100%{transform:translateY(-115vh) rotate(140deg) scale(1.1);opacity:0}}
        @keyframes bobD{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes popD{from{opacity:0;transform:scale(.94) translateY(12px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){ *{animation:none !important;} }
      `}</style>

      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {confete.map((h, i) => (
          <span key={i} style={{ position: "absolute", left: `${h.left}%`, bottom: "-50px", fontSize: h.size * s,
            animation: `floatUpDate ${h.dur}s linear ${h.delay}s infinite`, filter: "drop-shadow(0 6px 6px rgba(0,0,0,.25))" }}>
            {h.e}
          </span>
        ))}
      </div>

      <div key={screen} style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 430,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * s,
        textAlign: "center", animation: "popD .45s cubic-bezier(.2,.8,.2,1.05)" }}>

        {screen === "s1" && (
          <>
            <Personagem src={T.heroImg} emoji={T.emojiHero} tamanho={175} />
            <div style={card}>
              <h1 style={h1}>Você aceitaria ir a<br />um date comigo?</h1>
              <SimNao T={T} big={big} s={s} onSim={() => setScreen("s2")} />
            </div>
          </>
        )}

        {screen === "s2" && (
          <>
            <Personagem src={T.simImg} emoji={T.emojiSim} tamanho={160} />
            <div style={card}>
              <h1 style={h1}>Você disse sim? 🥺</h1>
              <p style={sub}>Eu já sabia que não tinha como dizer não kkkk</p>
              <button style={{ ...btn(), marginTop: 18 }} onClick={() => setScreen("s3")}>PRÓXIMO {T.coracao}</button>
            </div>
          </>
        )}

        {screen === "s3" && (
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
            <h1 style={h1}>📅 Quando você tá livre?</h1>
            <label style={fl}>Escolhe a data</label>
            <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} style={field} />
            <label style={fl}>Escolhe o horário</label>
            <input type="time" value={timeVal} onChange={(e) => setTimeVal(e.target.value)} style={field} />
            <button style={{ ...btn(), marginTop: 10 }} onClick={() => setScreen("s4")}>SELECIONAR A DATA {T.coracao}</button>
          </div>
        )}

        {screen === "s4" && (
          <div style={card}>
            <h1 style={h1}>O que tá afim? 🤤</h1>
            <div style={{ ...grid, marginTop: 14 }}>
              {foods.map(([e, n]) => {
                const val = `${e} ${n}`;
                return (
                  <div key={n} style={opt(food === val)} onClick={() => setFood(val)}>
                    <span style={{ fontSize: T.optionCols === 2 ? 30 : 26 }}>{e}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700 }}>{n}</span>
                  </div>
                );
              })}
            </div>
            <button style={{ ...btn(!food), marginTop: 16 }} disabled={!food} onClick={() => food && setScreen("s5")}>
              {food ? `CONTINUAR ${T.coracao}` : "ESCOLHE PRIMEIRO 👆"}
            </button>
          </div>
        )}

        {screen === "s5" && (
          <div style={card}>
            <h1 style={h1}>Qual é a vibe? 🌼</h1>
            <p style={sub}>Escolhe a atividade ideal</p>
            <div style={{ ...grid, marginTop: 14 }}>
              {vibes.map(([e, n]) => {
                const val = `${e} ${n}`;
                return (
                  <div key={n} style={opt(vibe === val)} onClick={() => setVibe(val)}>
                    <span style={{ fontSize: T.optionCols === 2 ? 30 : 26 }}>{e}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700 }}>{n}</span>
                  </div>
                );
              })}
            </div>
            <button style={{ ...btn(!vibe), marginTop: 16 }} disabled={!vibe} onClick={() => vibe && setScreen("s6")}>
              {vibe ? `BORA! ${T.coracao}` : "ESCOLHE PRIMEIRO 👆"}
            </button>
          </div>
        )}

        {screen === "s6" && (
          <>
            <Personagem src={T.heroImg} emoji={T.emojiFim} tamanho={175} />
            <div style={card}>
              <h1 style={h1}>Tô contigo, {nickShow}. {T.coracao}</h1>
              <p style={sub}>Fica pronta que eu vou te buscar 🚗</p>
              <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 14,
                background: T.colorScheme === "dark" ? "rgba(0,0,0,.22)" : T.fieldBg,
                border: `1px solid ${T.cardBorder}`, textAlign: "left", fontSize: 13.5, lineHeight: 1.7 }}>
                <div>📅 {fmt(dateVal)}</div>
                <div>⏰ {timeVal || "—"}</div>
                <div>🍽️ {food || "—"}</div>
                <div>✨ {vibe || "—"}</div>
              </div>
              <button style={{ ...btn(), marginTop: 18 }} onClick={sendZap}>MANDAR MINHA RESPOSTA NO ZAP 💌</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function SimNao({ T, big = false, s = 1, onSim }: { T: Tokens; big?: boolean; s?: number; onSim: () => void }) {
  const [dodges, setDodges] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const zone = useRef<HTMLDivElement>(null);
  const desistiu = dodges >= 3;

  const fugir = () => {
    if (desistiu) return;
    const reduzir = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduzir) { setDodges(3); return; }
    const w = zone.current?.offsetWidth ?? 260;
    setPos({ x: (Math.random() - 0.5) * Math.min(w * 0.5, 150), y: (Math.random() - 0.5) * 70 });
    setDodges((d) => d + 1);
  };

  const base: React.CSSProperties = {
    flex: 1, border: "none", cursor: "pointer", fontWeight: 800,
    letterSpacing: T.titleUpper ? 0.5 : 0.2, fontSize: big ? 17 : 14.5,
    padding: big ? "15px 18px" : "12px 14px", borderRadius: T.btnRadius, fontFamily: "inherit",
  };

  return (
    <>
      {desistiu && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 14 }}>
          {T.sadImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={T.sadImg} alt="" width={110 * s} height={110 * s}
              style={{ objectFit: "contain", filter: "drop-shadow(0 8px 12px rgba(0,0,0,.3))",
                ...(T.imgComFundo ? { mixBlendMode: "multiply" as const } : {}) }} />
          )}
          <p style={{ fontSize: big ? 15 : 13, color: T.muted, fontWeight: 800, margin: 0 }}>
            POR FAVOR {T.sadImg ? "" : "🥺👉👈"}
          </p>
        </div>
      )}
      <div ref={zone} style={{ position: "relative", display: "flex", gap: 12, marginTop: 16, alignItems: "center", minHeight: big ? 56 : 46 }}>
        <button style={{ ...base, color: T.btnText, background: T.btnBg, boxShadow: T.btnShadow }} onClick={onSim}>SIM</button>
        <button onMouseEnter={fugir} onFocus={fugir} onClick={fugir} aria-label={desistiu ? "Não (desistiu)" : "Não"}
          style={{ ...base, flex: desistiu ? 0.55 : 1, padding: desistiu ? "9px 12px" : base.padding,
            fontSize: desistiu ? 12 : base.fontSize, color: T.text,
            background: T.colorScheme === "dark" ? "rgba(0,0,0,.24)" : "rgba(0,0,0,.05)",
            border: `1.5px solid ${T.cardBorder}`, cursor: desistiu ? "not-allowed" : "pointer",
            opacity: desistiu ? 0.5 : 1, transform: `translate(${pos.x}px, ${pos.y}px)`,
            transition: "transform .22s cubic-bezier(.3,1.4,.5,1), font-size .3s, padding .3s, flex .3s" }}>
          {desistiu ? "tá bom, é sim 😮‍💨" : "NÃO"}
        </button>
      </div>
    </>
  );
}

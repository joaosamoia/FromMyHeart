"use client";

// components/DatePage.tsx
// Template "Date" — convite interativo "Aceita um date? 💙". Produto separado,
// vendido por R$9,90, com seu próprio fluxo curto no quiz (sem tema, contador,
// timeline etc — não fazem sentido pra esse formato).

import { useState } from "react";

export default function DatePage({
  whatsapp,
  nickname,
  big = false,
}: {
  whatsapp?: string;
  nickname?: string;
  big?: boolean;
}) {
  const wa = whatsapp && whatsapp.replace(/\D/g, "").length >= 10 ? whatsapp.replace(/\D/g, "") : "";
  const nick = nickname && nickname.trim() ? nickname.trim().toUpperCase() : "AMOR";
  const [screen, setScreen] = useState<"s1" | "s2" | "s3" | "s4" | "s5" | "s6">("s1");
  const [noGone, setNoGone] = useState(false);
  const [food, setFood] = useState<string | null>(null);
  const [vibe, setVibe] = useState<string | null>(null);
  const [dateVal, setDateVal] = useState("");
  const [timeVal, setTimeVal] = useState("");

  const O = { orange: "#F94C12", orange2: "#FF6A2B", btn: "#FF5A1F", card: "rgba(28,10,4,.62)", line: "rgba(255,120,60,.35)", field: "rgba(20,6,2,.6)", text: "#FFF4EE", muted: "#FFD9C7" };
  const s = big ? 1.12 : 1;
  const heartEmojis = ["💙", "🖤", "🤎", "❤️", "💜"];
  const hearts = Array.from({ length: 14 }, (_, i) => ({
    left: (i * 37) % 100,
    dur: 6 + ((i * 13) % 6),
    delay: (i * 7) % 6,
    size: 16 + ((i * 5) % 14),
    e: heartEmojis[i % heartEmojis.length],
  }));

  const foods = [["🍔", "Hambúrguer"], ["🍣", "Sushi"], ["🍝", "Massas"], ["🌮", "Tacos"], ["🍕", "Pizza"]];
  const vibes = [["⛳", "Golfe"], ["🚶", "Caminhada"], ["🎬", "Cinema"], ["💃", "Dança"], ["🎢", "Parque"], ["🏖️", "Praia"]];
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const fmt = (v: string) => {
    if (!v) return "—";
    const [y, m, dd] = v.split("-");
    return `${parseInt(dd)} de ${meses[parseInt(m) - 1]} de ${y}`;
  };
  const sendZap = () => {
    const msg = `Aceitei nosso date! 💙\n\n📅 ${fmt(dateVal)}\n⏰ ${timeVal || "—"}\n🍽️ ${food || "—"}\n✨ ${vibe || "—"}`;
    if (wa) window.open?.("https://wa.me/" + wa + "?text=" + encodeURIComponent(msg), "_blank");
    else alert("O número de WhatsApp não foi configurado nesta página.");
  };

  const h1: React.CSSProperties = { fontSize: big ? 25 : 19, fontWeight: 800, letterSpacing: 0.4, lineHeight: 1.18, textShadow: "0 2px 0 rgba(0,0,0,.35)", margin: 0, color: O.text };
  const sub: React.CSSProperties = { fontSize: big ? 15 : 13, color: O.muted, fontWeight: 600, margin: "8px 0 0" };
  const card: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: O.card, border: `1px solid ${O.line}`, borderRadius: 22, padding: big ? "22px 20px" : "18px 16px", boxShadow: "0 18px 40px rgba(0,0,0,.32)" };
  const btn = (dis?: boolean): React.CSSProperties => ({ width: "100%", border: "none", cursor: dis ? "default" : "pointer", color: "#fff", fontWeight: 800, letterSpacing: 0.5, fontSize: big ? 17 : 14.5, padding: big ? "15px 18px" : "12px 14px", borderRadius: 40, fontFamily: "inherit", opacity: dis ? 0.55 : 1, background: dis ? "#a85a3e" : `linear-gradient(180deg,#FF7A3D,${O.btn})`, boxShadow: dis ? "none" : "0 10px 22px rgba(255,90,31,.5)" });
  const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: O.field, border: `1px solid ${O.line}`, borderRadius: 14, padding: "12px 14px", color: O.text, fontSize: 15, fontFamily: "inherit", colorScheme: "dark", outline: "none" };
  const fl: React.CSSProperties = { alignSelf: "flex-start", fontSize: 11.5, color: O.muted, fontWeight: 700 };
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, width: "100%" };
  const opt = (sel: boolean): React.CSSProperties => ({ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 4px", borderRadius: 16, cursor: "pointer", background: sel ? "rgba(255,120,60,.22)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${sel ? "#ffb27a" : O.line}`, boxShadow: sel ? "0 0 0 3px rgba(255,120,60,.25)" : "none" });
  const emojiTop: React.CSSProperties = { fontSize: 70 * s, lineHeight: 1, animation: "bobD 3s ease-in-out infinite", filter: "drop-shadow(0 10px 14px rgba(0,0,0,.35))" };

  return (
    <div style={{ minHeight: big ? "100vh" : "100%", background: `radial-gradient(120% 120% at 50% 0%, ${O.orange2} 0%, ${O.orange} 55%, #E03A07 100%)`, color: O.text, fontFamily: "'Trebuchet MS','Segoe UI',system-ui,sans-serif", position: "relative", overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: big ? "40px 22px" : "36px 16px 20px" }}>
      <style>{`@keyframes floatUpDate{0%{transform:translateY(0) rotate(0) scale(.8);opacity:0}12%{opacity:.9}88%{opacity:.9}100%{transform:translateY(-115vh) rotate(140deg) scale(1.1);opacity:0}}@keyframes bobD{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes popD{from{opacity:0;transform:scale(.94) translateY(12px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {hearts.map((h, i) => (
          <span key={i} style={{ position: "absolute", left: `${h.left}%`, bottom: "-50px", fontSize: h.size * s, animation: `floatUpDate ${h.dur}s linear ${h.delay}s infinite`, filter: "drop-shadow(0 6px 6px rgba(0,0,0,.35))" }}>
            {h.e}
          </span>
        ))}
      </div>

      <div key={screen} style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 430, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * s, textAlign: "center", animation: "popD .45s cubic-bezier(.2,.8,.2,1.05)" }}>
        {screen === "s1" && (
          <>
            <div style={emojiTop}>🐧</div>
            <div style={card}>
              <h1 style={h1}>
                VOCÊ ACEITARIA IR A<br />UM DATE COMIGO?
              </h1>
              {noGone && <p style={{ ...sub, fontWeight: 800 }}>POR FAVOR 🥺👉👈</p>}
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button style={btn()} onClick={() => setScreen("s2")}>SIM</button>
                {!noGone && (
                  <button style={btn()} onClick={() => setNoGone(true)}>
                    NÃO
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {screen === "s2" && (
          <>
            <div style={emojiTop}>🥰</div>
            <div style={card}>
              <h1 style={h1}>VOCÊ DISSE SIM? 🥺</h1>
              <p style={sub}>Eu estava esperando você dizer não kkkk</p>
              <button style={{ ...btn(), marginTop: 18 }} onClick={() => setScreen("s3")}>
                PRÓXIMO 💙
              </button>
            </div>
          </>
        )}

        {screen === "s3" && (
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
            <h1 style={h1}>📅 QUANDO VOCÊ TÁ LIVRE?</h1>
            <label style={fl}>Escolhe a data</label>
            <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} style={field} />
            <label style={fl}>Escolhe o horário</label>
            <input type="time" value={timeVal} onChange={(e) => setTimeVal(e.target.value)} style={field} />
            <button style={{ ...btn(), marginTop: 10 }} onClick={() => setScreen("s4")}>
              SELECIONAR A DATA 💙
            </button>
          </div>
        )}

        {screen === "s4" && (
          <div style={card}>
            <h1 style={h1}>O QUE TÁ AFIM? 🤤</h1>
            <div style={{ ...grid, marginTop: 14 }}>
              {foods.map(([e, n]) => {
                const val = `${e} ${n}`;
                return (
                  <div key={n} style={opt(food === val)} onClick={() => setFood(val)}>
                    <span style={{ fontSize: 26 }}>{e}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700 }}>{n}</span>
                  </div>
                );
              })}
            </div>
            <button style={{ ...btn(!food), marginTop: 16 }} disabled={!food} onClick={() => food && setScreen("s5")}>
              {food ? "CONTINUAR 💙" : "ESCOLHE PRIMEIRO 👆"}
            </button>
          </div>
        )}

        {screen === "s5" && (
          <div style={card}>
            <h1 style={h1}>QUAL É A VIBE? 🌼</h1>
            <p style={sub}>Escolhe a atividade ideal</p>
            <div style={{ ...grid, marginTop: 14 }}>
              {vibes.map(([e, n]) => {
                const val = `${e} ${n}`;
                return (
                  <div key={n} style={opt(vibe === val)} onClick={() => setVibe(val)}>
                    <span style={{ fontSize: 26 }}>{e}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700 }}>{n}</span>
                  </div>
                );
              })}
            </div>
            <button style={{ ...btn(!vibe), marginTop: 16 }} disabled={!vibe} onClick={() => vibe && setScreen("s6")}>
              {vibe ? "BORA! 💙" : "ESCOLHE PRIMEIRO 👆"}
            </button>
          </div>
        )}

        {screen === "s6" && (
          <>
            <div style={emojiTop}>🐧</div>
            <div style={card}>
              <h1 style={h1}>TÔ CONTIGO, {nick}. 💙</h1>
              <p style={sub}>Fica pronta que eu vou te buscar 🚗</p>
              <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 14, background: "rgba(0,0,0,.22)", border: `1px solid ${O.line}`, textAlign: "left", fontSize: 13.5, lineHeight: 1.7 }}>
                <div>📅 {fmt(dateVal)}</div>
                <div>⏰ {timeVal || "—"}</div>
                <div>🍽️ {food || "—"}</div>
                <div>✨ {vibe || "—"}</div>
              </div>
              <button style={{ ...btn(), marginTop: 18 }} onClick={sendZap}>
                MANDAR MINHA RESPOSTA NO ZAP 💌
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

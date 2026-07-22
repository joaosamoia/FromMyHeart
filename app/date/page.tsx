"use client";

// app/date/page.tsx
// Landing dedicada ao produto "Date" (R$19,90) — separada da landing das
// páginas personalizadas (que fica em "/"). Identidade própria: laranja quente,
// coração azul, tom brincalhão — o oposto do rosa romântico da Clássica.
//
// A hero é o próprio convite jogável: quem chega tenta clicar no "NÃO" e ele
// foge. Isso é o produto se demonstrando sozinho, sem precisar explicar.

import { useState, useRef } from "react";
import Link from "next/link";
import DatePage, { DATE_TEMPLATES, type DateTemplateId } from "@/components/DatePage";

const C = {
  ember: "#F94C12",
  flare: "#FF7A3D",
  scorch: "#B62F08",
  ink: "#1C0A04",
  cream: "#FFF4EE",
  peach: "#FFD9C7",
  blue: "#4D7CFF",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap');`;

export default function DateLanding() {
  return (
    <div style={{ background: C.ink, color: C.cream, fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh" }}>
      <style>{FONTS}{`
        @keyframes floatUpD { 0%{transform:translateY(0) rotate(0);opacity:0} 12%{opacity:.85} 88%{opacity:.85} 100%{transform:translateY(-110vh) rotate(140deg);opacity:0} }
        @keyframes bobD { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @media (prefers-reduced-motion: reduce){ *{animation:none !important; transition:none !important;} }
        .dl-cta:hover { transform: translateY(-2px); }
        .dl-cta:focus-visible, .dl-no:focus-visible, .dl-sim:focus-visible { outline:3px solid ${C.blue}; outline-offset:3px; }
        .dl-h1 { font-size: clamp(38px, 11vw, 78px); }
        .dl-sec { font-size: clamp(26px, 6vw, 40px); }
      `}</style>

      <Hero />
      <ComoFunciona />
      <DemoAoVivo />
      <Preco />
      <Rodape />
    </div>
  );
}

// ───────── HERO: o convite jogável ─────────
function Hero() {
  const [dodges, setDodges] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [answered, setAnswered] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const gaveUp = dodges >= 3;

  const dodge = () => {
    if (gaveUp) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDodges(3);
      return;
    }
    const w = zone.current?.offsetWidth ?? 300;
    setPos({
      x: (Math.random() - 0.5) * Math.min(w * 0.55, 190),
      y: (Math.random() - 0.5) * 90,
    });
    setDodges((d) => d + 1);
  };

  const hearts = Array.from({ length: 12 }, (_, i) => ({
    left: (i * 41) % 100,
    dur: 7 + ((i * 11) % 7),
    delay: (i * 5) % 7,
    size: 14 + ((i * 7) % 16),
    e: ["💙", "🖤", "🤎", "❤️", "💜"][i % 5],
  }));

  return (
    <section
      style={{
        position: "relative",
        background: `radial-gradient(120% 110% at 50% 0%, ${C.flare} 0%, ${C.ember} 52%, ${C.scorch} 100%)`,
        padding: "28px 20px 64px",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {hearts.map((h, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${h.left}%`,
              bottom: "-40px",
              fontSize: h.size,
              animation: `floatUpD ${h.dur}s linear ${h.delay}s infinite`,
              filter: "drop-shadow(0 6px 6px rgba(0,0,0,.3))",
            }}
          >
            {h.e}
          </span>
        ))}
      </div>

      <div style={{ position: "relative", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, opacity: 0.85, marginBottom: 30 }}>
          FROMMYHEART
        </div>

        <div style={{ fontSize: 64, animation: "bobD 3s ease-in-out infinite", marginBottom: 14 }}>🐧</div>

        <h1
          className="dl-h1"
          style={{
            fontFamily: "'Anton', Impact, sans-serif",
            lineHeight: 0.92,
            letterSpacing: -0.5,
            margin: "0 0 14px",
            textShadow: "0 3px 0 rgba(0,0,0,.28)",
          }}
        >
          VOCÊ ACEITARIA IR
          <br />A UM DATE COMIGO?
        </h1>

        <p style={{ fontSize: 16, color: C.peach, fontWeight: 500, margin: "0 0 30px" }}>
          {answered
            ? "Foi assim que você respondeu. Agora imagina a pessoa recebendo isso. 💙"
            : gaveUp
              ? "Tá vendo? Não tem como dizer não. 😅"
              : "Vai, tenta clicar no “não”."}
        </p>

        <div
          ref={zone}
          style={{
            position: "relative",
            display: "flex",
            gap: 12,
            justifyContent: "center",
            alignItems: "center",
            minHeight: 76,
            maxWidth: 380,
            margin: "0 auto",
          }}
        >
          <button
            className="dl-sim"
            onClick={() => setAnswered(true)}
            style={{
              flex: 1,
              padding: "17px 20px",
              borderRadius: 40,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: 0.5,
              color: "#fff",
              background: `linear-gradient(180deg, #FF9354, ${C.ember})`,
              boxShadow: "0 10px 24px rgba(0,0,0,.32)",
            }}
          >
            SIM
          </button>

          {!answered && (
            <button
              className="dl-no"
              onMouseEnter={dodge}
              onFocus={dodge}
              onClick={dodge}
              aria-label={gaveUp ? "Não (desistiu)" : "Não"}
              style={{
                flex: gaveUp ? 0.5 : 1,
                padding: gaveUp ? "11px 14px" : "17px 20px",
                borderRadius: 40,
                border: `1.5px solid rgba(255,255,255,.4)`,
                cursor: gaveUp ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: gaveUp ? 13 : 18,
                letterSpacing: 0.5,
                color: C.cream,
                background: "rgba(0,0,0,.22)",
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                transition: "transform .22s cubic-bezier(.3,1.4,.5,1), font-size .3s, padding .3s, flex .3s",
                opacity: gaveUp ? 0.5 : 1,
              }}
            >
              {gaveUp ? "tá bom, é sim 😮‍💨" : "NÃO"}
            </button>
          )}
        </div>

        <p style={{ fontSize: 14.5, color: C.peach, marginTop: 34, lineHeight: 1.55, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
          Esse é o convite que você manda pra pessoa. Ela responde no celular dela — e a
          resposta chega no seu WhatsApp.
        </p>

        <CTA texto="Criar meu convite" />
      </div>
    </section>
  );
}

// ───────── COMO FUNCIONA ─────────
function ComoFunciona() {
  // Isto é uma sequência real (uma coisa depende da anterior), então numerar faz sentido.
  const passos = [
    { n: "1", t: "Você cria o link", d: "Coloca seu WhatsApp e um apelido carinhoso. Leva um minuto." },
    { n: "2", t: "Manda pra pessoa", d: "Um link só. Funciona no WhatsApp, Instagram, onde você quiser." },
    { n: "3", t: "Ela responde brincando", d: "Aceita o date, escolhe a data, a comida e o rolê." },
    { n: "4", t: "Cai no seu WhatsApp", d: "Você recebe tudo pronto: dia, hora, comida e o que fazer." },
  ];

  return (
    <section style={{ padding: "64px 20px", maxWidth: 640, margin: "0 auto" }}>
      <h2 className="dl-sec" style={{ fontFamily: "'Anton', Impact, sans-serif", lineHeight: 1, margin: "0 0 36px", letterSpacing: -0.3 }}>
        COMO FUNCIONA
      </h2>

      <div style={{ display: "grid", gap: 2 }}>
        {passos.map((p, i) => (
          <div
            key={p.n}
            style={{
              display: "flex",
              gap: 18,
              padding: "22px 0",
              borderTop: i === 0 ? `1px solid rgba(255,120,60,.28)` : "none",
              borderBottom: `1px solid rgba(255,120,60,.28)`,
            }}
          >
            <span
              style={{
                fontFamily: "'Anton', Impact, sans-serif",
                fontSize: 30,
                color: C.ember,
                lineHeight: 1,
                minWidth: 32,
              }}
            >
              {p.n}
            </span>
            <span>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{p.t}</div>
              <div style={{ fontSize: 14.5, color: C.peach, lineHeight: 1.5 }}>{p.d}</div>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────── DEMO AO VIVO ─────────
function DemoAoVivo() {
  const [tpl, setTpl] = useState<DateTemplateId>("sunset");

  return (
    <section style={{ padding: "20px 20px 64px", textAlign: "center" }}>
      <h2 className="dl-sec" style={{ fontFamily: "'Anton', Impact, sans-serif", lineHeight: 1, margin: "0 0 10px", letterSpacing: -0.3 }}>
        EXPERIMENTA AÍ
      </h2>
      <p style={{ fontSize: 14.5, color: C.peach, margin: "0 0 22px" }}>
        Dois visuais pra escolher. É isso que a pessoa vai ver.
      </p>

      <div style={{ display: "inline-flex", gap: 8, marginBottom: 26, padding: 5, borderRadius: 99, background: "rgba(0,0,0,.3)" }}>
        {(Object.keys(DATE_TEMPLATES) as DateTemplateId[]).map((id) => {
          const ativo = tpl === id;
          return (
            <button
              key={id}
              onClick={() => setTpl(id)}
              style={{
                padding: "10px 20px",
                borderRadius: 99,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 14,
                color: ativo ? C.scorch : C.peach,
                background: ativo ? C.cream : "transparent",
                transition: "all .2s",
              }}
            >
              {DATE_TEMPLATES[id].emojiFinal} {DATE_TEMPLATES[id].nome}
            </button>
          );
        })}
      </div>

      <div
        style={{
          width: 290,
          maxWidth: "92vw",
          margin: "0 auto",
          borderRadius: 44,
          padding: 10,
          background: "#0d0402",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,.7)",
          border: "1px solid rgba(255,120,60,.25)",
        }}
      >
        <div style={{ position: "relative", borderRadius: 34, overflow: "hidden", height: 540 }}>
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              width: 74,
              height: 20,
              background: "#000",
              borderRadius: 99,
              zIndex: 3,
            }}
          />
          <DatePage key={tpl} nickname="gata" template={tpl} />
        </div>
      </div>
    </section>
  );
}

// ───────── PREÇO + CTA ─────────
function Preco() {
  return (
    <section
      style={{
        padding: "64px 20px 72px",
        textAlign: "center",
        background: `linear-gradient(180deg, transparent, rgba(249,76,18,.14))`,
        borderTop: "1px solid rgba(255,120,60,.2)",
      }}
    >
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: C.peach, marginBottom: 10 }}>
          PAGAMENTO ÚNICO
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 2 }}>
          <span style={{ fontSize: 19, color: C.peach, textDecoration: "line-through" }}>R$ 39,90</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.scorch, background: C.cream, padding: "4px 11px", borderRadius: 99 }}>
            -50%
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Anton', Impact, sans-serif",
            fontSize: "clamp(52px, 15vw, 68px)",
            lineHeight: 1,
            color: C.ember,
            marginBottom: 6,
          }}
        >
          R$ 19,90
        </div>
        <p style={{ fontSize: 15, color: C.peach, margin: "0 0 8px" }}>
          Sem mensalidade. O link é seu.
        </p>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "26px auto 0",
            display: "grid",
            gap: 10,
            maxWidth: 300,
            textAlign: "left",
          }}
        >
          {[
            "Convite interativo completo",
            "Resposta direto no seu WhatsApp",
            "Link pronto na hora",
            "Funciona em qualquer celular",
          ].map((f) => (
            <li key={f} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 15 }}>
              <span style={{ color: C.blue, fontSize: 17 }}>💙</span>
              {f}
            </li>
          ))}
        </ul>

        <CTA texto="Criar meu convite" grande />
      </div>
    </section>
  );
}

function CTA({ texto, grande = false }: { texto: string; grande?: boolean }) {
  return (
    <Link
      href="/criar?estilo=date"
      className="dl-cta"
      style={{
        display: "inline-block",
        marginTop: grande ? 32 : 30,
        padding: grande ? "19px 44px" : "17px 38px",
        borderRadius: 44,
        background: C.cream,
        color: C.scorch,
        fontWeight: 700,
        fontSize: grande ? 18 : 16.5,
        letterSpacing: 0.3,
        textDecoration: "none",
        boxShadow: "0 12px 28px rgba(0,0,0,.32)",
        transition: "transform .18s ease",
      }}
    >
      {texto} →
    </Link>
  );
}

function Rodape() {
  return (
    <footer
      style={{
        padding: "28px 20px 40px",
        textAlign: "center",
        fontSize: 13.5,
        color: C.peach,
        borderTop: "1px solid rgba(255,120,60,.2)",
      }}
    >
      Quer algo mais romântico?{" "}
      <Link href="/" style={{ color: C.cream, fontWeight: 700 }}>
        Veja as páginas de amor personalizadas
      </Link>
    </footer>
  );
}

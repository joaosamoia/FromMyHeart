// app/page.tsx
// Home da marca FromMyHeart. O trabalho desta página é um só: em 3 segundos,
// a pessoa entende o que é e escolhe entre os dois produtos. Por isso ela é
// uma bifurcação, não uma página de vendas — cada produto tem a sua landing.
//
// A paleta sai da própria logo (blush, creme, coral, marrom) e o fundo usa
// exatamente a cor de fundo do arquivo da logo, pra ela encaixar sem emenda.

import Link from "next/link";

const B = {
  blush: "#FEEBE4",
  cream: "#FFFAF7",
  ink: "#3A241F",
  muted: "#9C7E78",
  rose: "#DE6E7C",
  roseSoft: "#F7D9DC",
  ember: "#F94C12",
  emberSoft: "#FBDCCF",
};

const PRODUTOS = [
  {
    href: "/criar",
    emoji: "💌",
    nome: "Página de amor",
    desc: "Contador de tempo juntos, fotos, linha do tempo e a sua declaração.",
    preco: "a partir de R$ 24,90",
    cor: B.rose,
    corSoft: B.roseSoft,
  },
  {
    href: "/date",
    emoji: "🐧",
    nome: "Convite de date",
    desc: "Um “aceita um date?” interativo. A resposta cai no seu WhatsApp.",
    preco: "R$ 19,90",
    cor: B.ember,
    corSoft: B.emberSoft,
  },
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: B.blush,
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px 48px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-frommyheart.jpg"
          alt="FromMyHeart"
          width={260}
          height={260}
          style={{ width: 260, maxWidth: "72vw", height: "auto", margin: "0 auto", display: "block" }}
        />

        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 25,
            fontWeight: 600,
            color: B.ink,
            lineHeight: 1.25,
            margin: "4px 0 8px",
          }}
        >
          Duas formas de dizer
          <br />o que você sente
        </h1>
        <p style={{ fontSize: 14.5, color: B.muted, margin: "0 0 28px", lineHeight: 1.5 }}>
          Escolha o presente e monte em poucos minutos.
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          {PRODUTOS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 15,
                textAlign: "left",
                textDecoration: "none",
                padding: "18px 18px",
                borderRadius: 20,
                background: B.cream,
                border: `1px solid ${p.corSoft}`,
                boxShadow: "0 8px 22px -12px rgba(90,50,45,.28)",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 52,
                  height: 52,
                  borderRadius: 15,
                  background: p.corSoft,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 25,
                  lineHeight: 1,
                }}
              >
                {p.emoji}
              </span>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 18,
                    fontWeight: 600,
                    color: B.ink,
                  }}
                >
                  {p.nome}
                </span>
                <span style={{ display: "block", fontSize: 13, color: B.muted, lineHeight: 1.45, margin: "3px 0 6px" }}>
                  {p.desc}
                </span>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: p.cor }}>{p.preco}</span>
              </span>

              <span style={{ flexShrink: 0, color: p.cor, fontSize: 20, lineHeight: 1 }} aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>

        <p style={{ fontSize: 12, color: B.muted, marginTop: 30, letterSpacing: 0.2 }}>
          pagamento único · link pronto na hora · feito com ♥
        </p>
      </div>
    </main>
  );
}

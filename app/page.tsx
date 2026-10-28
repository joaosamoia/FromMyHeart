// app/page.tsx
// Home da marca FromMyHeart. O trabalho desta página é um só: em 3 segundos,
// a pessoa entende o que é e escolhe um dos produtos. Por isso ela é uma
// bifurcação, não uma página de vendas — cada produto tem o seu fluxo.
//
// Visual: o mesmo da Retrospectiva do Casal (paleta Paixão, blocos de cor
// chapada, números gigantes). Cada produto é uma "cartela" de cor, como os
// slides — o site inteiro parece uma retrospectiva.

import Link from "next/link";
import { BR, D_FONT, B_FONT, BRAND_CSS, Blobs, Logo, Kicker, Marquee } from "@/components/brand";

const PRODUTOS = [
  {
    href: "/criar?estilo=retro",
    n: "01",
    nome: "Retrospectiva do Casal",
    desc: "O ano de vocês em slides estilo stories: dias juntos, um momento por mês, o top 5 de músicas e um card pra postar.",
    preco: "R$ 29,90",
    tag: "NOVO",
    bg: BR.pink,
    fg: BR.cream,
    ac: BR.yellow,
    rot: -1.2,
  },
  {
    href: "/criar",
    n: "02",
    nome: "Página de Amor",
    desc: "Contador de tempo juntos ao vivo, fotos, linha do tempo e a sua declaração.",
    preco: "a partir de R$ 24,90",
    bg: BR.blush,
    fg: BR.wine,
    ac: BR.pink,
    rot: 0.8,
  },
  {
    href: "/date",
    n: "03",
    nome: "Convite de Date",
    desc: "Um “aceita um date?” interativo. Ela responde brincando e a resposta cai no seu WhatsApp.",
    preco: "R$ 19,90",
    bg: BR.orange,
    fg: BR.wine,
    ac: BR.cream,
    rot: -0.6,
  },
];

const PASSOS = [
  { n: "1", t: "Você monta", d: "Fotos, músicas, mensagem. Tudo pelo celular, em poucos minutos." },
  { n: "2", t: "Recebe o link", d: "Liberado na hora, junto com um QR Code pra imprimir." },
  { n: "3", t: "Ela se emociona", d: "Manda no WhatsApp, ou entrega o QR num cartão. E filma a reação. 😉" },
];

export default function Home() {
  return (
    <main style={{ background: BR.wine, color: BR.cream, fontFamily: B_FONT, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{BRAND_CSS}</style>

      {/* ───────── HERO ───────── */}
      <section style={{ position: "relative", padding: "22px 20px 56px", overflow: "hidden" }}>
        <Blobs a={BR.pink} b={BR.orange} opacity={0.45} />
        <div style={{ position: "relative", maxWidth: 560, margin: "0 auto" }}>
          <Logo />

          <div style={{ marginTop: 56 }}>
            <Kicker color={BR.blush}>presentes digitais pra quem você ama</Kicker>
            <h1
              className="br-in"
              style={{
                ["--d" as string]: "120ms",
                fontFamily: D_FONT,
                fontWeight: 800,
                fontSize: "clamp(46px, 13vw, 84px)",
                lineHeight: 0.92,
                letterSpacing: "-0.035em",
                margin: "14px 0 0",
              }}
            >
              Diga o que
              <br />
              sente do jeito
              <br />
              <span style={{ color: BR.yellow }}>que ela nunca viu.</span>
            </h1>
            <p className="br-in" style={{ ["--d" as string]: "300ms", fontSize: 17, lineHeight: 1.5, color: BR.blush, maxWidth: 420, margin: "22px 0 0" }}>
              Monta em minutos, recebe o link na hora e manda pelo WhatsApp. Sem app, sem complicação.
            </p>
            <Link
              href="#produtos"
              className="br-in br-btn"
              style={{
                ["--d" as string]: "450ms",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginTop: 30,
                padding: "17px 30px",
                borderRadius: 99,
                background: BR.yellow,
                color: BR.wine,
                fontFamily: D_FONT,
                fontWeight: 800,
                fontSize: 18,
                textDecoration: "none",
                boxShadow: `0 6px 0 ${BR.night}`,
              }}
            >
              Escolher meu presente ↓
            </Link>
          </div>
        </div>
      </section>

      <Marquee items={["Retrospectiva do casal", "Página de amor", "Convite de date", "Mapa estelar", "QR Code pra imprimir", "Link na hora"]} />

      {/* ───────── PRODUTOS ───────── */}
      <section id="produtos" style={{ padding: "60px 20px 40px", maxWidth: 600, margin: "0 auto", scrollMarginTop: 10 }}>
        <Kicker color={BR.pinkHot}>escolha o presente</Kicker>
        <h2 style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "clamp(36px, 9vw, 52px)", lineHeight: 0.95, letterSpacing: "-0.03em", margin: "10px 0 34px" }}>
          Três formas de
          <br />
          dizer “eu te amo”
        </h2>

        <div style={{ display: "grid", gap: 22 }}>
          {PRODUTOS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="br-card"
              style={{
                position: "relative",
                display: "block",
                padding: "24px 22px 22px",
                borderRadius: 28,
                background: p.bg,
                color: p.fg,
                textDecoration: "none",
                transform: `rotate(${p.rot}deg)`,
                boxShadow: `0 8px 0 ${BR.night}`,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: 15, opacity: 0.7 }}>{p.n}</span>
                {p.tag && (
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", background: p.ac, color: p.bg === BR.pink ? BR.wine : p.bg, padding: "5px 11px", borderRadius: 99 }}>
                    {p.tag}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "clamp(34px, 9vw, 46px)", lineHeight: 0.95, letterSpacing: "-0.03em", marginTop: 14 }}>{p.nome}</div>
              <p style={{ fontSize: 15, lineHeight: 1.5, margin: "12px 0 20px", opacity: 0.88, maxWidth: 440 }}>{p.desc}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: 20 }}>{p.preco}</span>
                <span
                  aria-hidden
                  style={{ width: 48, height: 48, borderRadius: "50%", background: p.fg, color: p.bg, display: "grid", placeItems: "center", fontSize: 22, fontWeight: 800, flexShrink: 0 }}
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── COMO FUNCIONA ───────── */}
      <section style={{ position: "relative", background: BR.pink, padding: "60px 20px", overflow: "hidden" }}>
        <Blobs a={BR.yellow} b={BR.plum} opacity={0.3} />
        <div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
          <Kicker color={BR.wine}>como funciona</Kicker>
          <h2 style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "clamp(36px, 9vw, 52px)", lineHeight: 0.95, letterSpacing: "-0.03em", margin: "10px 0 30px" }}>
            Pronto em
            <br />
            <span style={{ color: BR.yellow }}>3 passos</span>
          </h2>
          <div style={{ display: "grid", gap: 0 }}>
            {PASSOS.map((p) => (
              <div key={p.n} style={{ display: "flex", gap: 18, alignItems: "flex-start", padding: "20px 0", borderTop: `2px solid ${BR.cream}40` }}>
                <span style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: 64, lineHeight: 0.8, color: BR.wine, minWidth: 44 }}>{p.n}</span>
                <span>
                  <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: 24, lineHeight: 1.1 }}>{p.t}</div>
                  <div style={{ fontSize: 15, lineHeight: 1.5, marginTop: 4, opacity: 0.92 }}>{p.d}</div>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── EXEMPLO ───────── */}
      <section style={{ padding: "60px 20px", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <Kicker color={BR.pinkHot}>quer ver antes?</Kicker>
        <h2 style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: "clamp(32px, 8vw, 46px)", lineHeight: 1, letterSpacing: "-0.03em", margin: "10px 0 14px" }}>
          Abre um exemplo
          <br />
          no seu celular
        </h2>
        <p style={{ fontSize: 15.5, color: BR.muted, lineHeight: 1.5, margin: "0 auto 26px", maxWidth: 380 }}>
          É exatamente isso que a pessoa recebe. Toque pra passar os slides.
        </p>
        <Link
          href="/retrospectiva/exemplo"
          className="br-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 28px", borderRadius: 99, background: BR.cream, color: BR.wine, fontFamily: D_FONT, fontWeight: 800, fontSize: 17, textDecoration: "none", boxShadow: `0 6px 0 ${BR.pink}` }}
        >
          ▶ Ver retrospectiva de exemplo
        </Link>
      </section>

      <footer style={{ background: BR.night, padding: "34px 20px 44px", textAlign: "center" }}>
        <Logo size={30} />
        <p style={{ fontSize: 13, color: BR.muted, marginTop: 14, letterSpacing: 0.2 }}>pagamento único · link pronto na hora · feito com ♥</p>
      </footer>
    </main>
  );
}

// components/brand.tsx
// Sistema visual do site de venda (home, quiz, /date, /obrigado), tirado da
// paleta "Paixão" da Retrospectiva: cores chapadas, tipografia gigante em
// Bricolage Grotesque e manchas de cor borradas se mexendo no fundo.
// Os PRODUTOS que o cliente compra (página Clássica e convite de Date) têm
// identidade própria e não usam isto.

import Link from "next/link";

export const BR = {
  wine: "#2B0B3F", // fundo escuro principal
  night: "#1A0627", // ainda mais escuro, pra rodapé/contraste
  plum: "#6A1B4D",
  pink: "#E8336D", // cor da marca
  pinkHot: "#FF5C8A",
  orange: "#FF8A3D",
  yellow: "#FFD23F",
  blush: "#FFD9E4",
  cream: "#FFF4F7",
  muted: "#B79AB8", // texto secundário sobre fundo escuro
  mutedInk: "#8A6B86", // texto secundário sobre fundo claro
  line: "#F3D3E0",
  ok: "#1F9D72",
};

export const D_FONT = "'Bricolage Grotesque', 'Inter', system-ui, sans-serif";
export const B_FONT = "Inter, system-ui, sans-serif";

// Animações compartilhadas. Use className="br-in" + style={{"--d":"200ms"}}.
export const BRAND_CSS = `
@keyframes brIn { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes brPop { 0% { opacity: 0; transform: scale(.7) } 70% { opacity: 1; transform: scale(1.04) } 100% { opacity: 1; transform: none } }
@keyframes brFloat { from { transform: translate(0,0) scale(1) } to { transform: translate(40px,30px) scale(1.15) } }
@keyframes brMarquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
.br-in { opacity: 0; animation: brIn .7s cubic-bezier(.2,.8,.2,1) var(--d, 0ms) both; }
.br-pop { opacity: 0; animation: brPop .8s cubic-bezier(.2,.8,.2,1) var(--d, 0ms) both; }
.br-btn { transition: transform .15s ease, box-shadow .15s ease; }
.br-btn:hover { transform: translateY(-2px); }
.br-btn:active { transform: translateY(1px); }
.br-card { transition: transform .2s ease; }
.br-card:hover { transform: translateY(-3px) rotate(-.4deg); }
@media (prefers-reduced-motion: reduce) {
  .br-in, .br-pop { animation-duration: .01ms !important; animation-delay: 0ms !important; }
  .br-blob, .br-marquee { animation: none !important; }
}
`;

// Manchas de cor borradas no fundo (mesma ideia dos slides da Retrospectiva).
export function Blobs({ a = BR.pink, b = BR.orange, opacity = 0.35 }: { a?: string; b?: string; opacity?: number }) {
  const spots = [
    { top: "-18%", left: "-22%", size: 420, c: a, dur: 11 },
    { top: "55%", left: "58%", size: 380, c: b, dur: 14 },
  ];
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {spots.map((s, i) => (
        <div
          key={i}
          className="br-blob"
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: s.c,
            opacity,
            filter: "blur(70px)",
            animation: `brFloat ${s.dur}s ease-in-out ${-i * 3}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

export function Logo({ color = BR.cream, size = 34, href = "/" }: { color?: string; size?: number; href?: string | null }) {
  const inner = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color, textDecoration: "none" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-icon.png" alt="" width={size} height={size} style={{ borderRadius: size * 0.26, display: "block" }} />
      <span style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: size * 0.56, letterSpacing: "-0.02em" }}>FromMyHeart</span>
    </span>
  );
  return href ? (
    <Link href={href} aria-label="FromMyHeart, início" style={{ textDecoration: "none" }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function Kicker({ children, color, d = 0 }: { children: React.ReactNode; color?: string; d?: number }) {
  return (
    <div className="br-in" style={{ ["--d" as string]: `${d}ms`, fontSize: 12, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color, opacity: 0.9 }}>
      {children}
    </div>
  );
}

// Faixa rolando com palavras — o "barulho" visual das retrospectivas.
export function Marquee({ items, bg = BR.yellow, color = BR.wine }: { items: string[]; bg?: string; color?: string }) {
  const row = [...items, ...items];
  return (
    <div style={{ background: bg, color, overflow: "hidden", padding: "12px 0", whiteSpace: "nowrap" }}>
      <div className="br-marquee" style={{ display: "inline-flex", gap: 28, animation: "brMarquee 22s linear infinite", fontFamily: D_FONT, fontWeight: 800, fontSize: 18, letterSpacing: "-0.01em" }}>
        {row.map((t, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 28 }}>
            {t} <span style={{ opacity: 0.5 }}>♥</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// components/RetroStarMap.tsx
// Mapa das estrelas "do dia em que tudo começou" pra Retrospectiva — mesma ideia
// do Mapa Estelar da Página de Amor: uma constelação ÚNICA gerada a partir da
// data (e dos nomes), sempre igual pro mesmo casal. É um mapa artístico, não um
// mapa astronômico de verdade (não temos o local nem o horário).
//
// Sem hooks: dá pra usar tanto nos componentes de cliente quanto no servidor.

type Colors = { sky1: string; sky2: string; ring: string; star: string; line: string; label: string };

export const STARMAP_COLORS: Record<string, Colors> = {
  // noite azul-marinho com detalhe dourado (colagem Kraft/Sol)
  papel: { sky1: "#1E2A4A", sky2: "#0B1022", ring: "#C9A15A", star: "#FFF6E0", line: "#E9C77B", label: "#C9A15A" },
  // roxo profundo com rosa (coloridos)
  vivo: { sky1: "#3A1B6B", sky2: "#120726", ring: "#FF5C8A", star: "#FFFFFF", line: "#FFD23F", label: "#FFD9E4" },
};

function rng(seed: string) {
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) s = ((s ^ seed.charCodeAt(i)) * 16777619) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export default function RetroStarMap({ seed, colors, width = "100%", id }: { seed: string; colors: Colors; width?: string; id: string }) {
  const r = rng(seed || "fmh");
  const C = 150; // centro
  const R = 136; // raio do céu
  // estrelas de fundo, dentro do círculo
  const stars: { x: number; y: number; s: number; o: number; tw: boolean }[] = [];
  while (stars.length < 170) {
    const x = r() * 300, y = r() * 300;
    if (Math.hypot(x - C, y - C) > R - 3) continue;
    const big = r();
    stars.push({ x, y, s: big > 0.94 ? 1.7 + r() * 0.8 : 0.35 + r() * 0.9, o: 0.35 + r() * 0.65, tw: r() > 0.86 });
  }
  // duas constelações: o "nós" (5 estrelas) e uma menor (4)
  const constel = (n: number, cx: number, cy: number, spread: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 1.6 + r() * 0.9;
      const d = spread * (0.35 + r() * 0.65);
      return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
    });
  const c1 = constel(5, C - 30 + r() * 30, C - 34 + r() * 24, 48);
  const c2 = constel(4, C + 42 + r() * 20, C + 38 + r() * 18, 30);
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const gid = `sm-sky-${id}`;
  const fid = `sm-glow-${id}`;

  return (
    <svg viewBox="-16 -16 332 332" style={{ width, height: "auto", display: "block" }} role="img" aria-label="Mapa das estrelas do casal">
      <defs>
        <radialGradient id={gid} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor={colors.sky1} />
          <stop offset="100%" stopColor={colors.sky2} />
        </radialGradient>
        <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <style>{`@keyframes smTw{0%,100%{opacity:1}50%{opacity:.25}} .sm-tw{animation:smTw 2.8s ease-in-out infinite} @media (prefers-reduced-motion: reduce){.sm-tw{animation:none}}`}</style>
      </defs>

      {/* aro com marcações, como uma carta celeste */}
      <circle cx={C} cy={C} r={148} fill="none" stroke={colors.ring} strokeWidth="1.2" />
      {ticks.map((t) => {
        const a = (t * Math.PI) / 180, long = t % 30 === 0;
        return <line key={t} x1={C + Math.cos(a) * 141} y1={C + Math.sin(a) * 141} x2={C + Math.cos(a) * (long ? 148 : 145)} y2={C + Math.sin(a) * (long ? 148 : 145)} stroke={colors.ring} strokeWidth={long ? 1.2 : 0.6} />;
      })}
      <circle cx={C} cy={C} r={R + 2} fill={`url(#${gid})`} stroke={colors.ring} strokeWidth="0.8" strokeOpacity="0.7" />

      {/* via láctea */}
      <ellipse cx={C} cy={C} rx={R * 0.95} ry={R * 0.22} transform={`rotate(${-28 + r() * 20} ${C} ${C})`} fill={colors.star} opacity="0.07" filter={`url(#${fid})`} />
      {/* grade de coordenadas, bem discreta */}
      <circle cx={C} cy={C} r={R * 0.5} fill="none" stroke={colors.star} strokeOpacity="0.08" />
      <line x1={C - R} y1={C} x2={C + R} y2={C} stroke={colors.star} strokeOpacity="0.08" />
      <line x1={C} y1={C - R} x2={C} y2={C + R} stroke={colors.star} strokeOpacity="0.08" />

      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill={colors.star} opacity={s.o} className={s.tw ? "sm-tw" : undefined} style={s.tw ? { animationDelay: `${(i % 7) * 0.4}s` } : undefined} />
      ))}

      {[c1, c2].map((c, k) => (
        <g key={k}>
          <polyline points={c.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={colors.line} strokeWidth="0.9" strokeOpacity="0.75" />
          {c.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill={colors.line} opacity="0.25" filter={`url(#${fid})`} />
              <circle cx={p.x} cy={p.y} r={i === 0 && k === 0 ? 2.8 : 2} fill={colors.star} />
            </g>
          ))}
        </g>
      ))}

      {/* pontos cardeais */}
      {[
        ["N", C, -5],
        ["S", C, 313],
        ["L", 310, C + 3],
        ["O", -10, C + 3],
      ].map(([t, x, y]) => (
        <text key={t as string} x={x as number} y={y as number} textAnchor="middle" fontSize="8" fontFamily="Inter, sans-serif" fontWeight="700" fill={colors.label}>
          {t}
        </text>
      ))}
    </svg>
  );
}

// components/RetroMoon.tsx
// "A lua do dia em que tudo começou": a fase da lua de verdade na data de
// início do casal (calculada pelo ciclo lunar, ~29,53 dias, a partir de uma lua
// nova conhecida). Mostra o desenho da fase, o nome e quanto estava iluminada.
//
// Sem hooks: funciona em componente de cliente e de servidor.

type Colors = { sky1: string; sky2: string; ring: string; star: string; moon: string; shade: string; label: string };

export const MOON_COLORS: Record<string, Colors> = {
  // noite azul-marinho com dourado (colagem)
  papel: { sky1: "#1E2A4A", sky2: "#0B1022", ring: "#C9A15A", star: "#FFF6E0", moon: "#F7EFD8", shade: "#26304F", label: "#C9A15A" },
  // roxo profundo com rosa (coloridos)
  vivo: { sky1: "#3A1B6B", sky2: "#120726", ring: "#FF5C8A", star: "#FFFFFF", moon: "#FFF4E4", shade: "#2A1550", label: "#FFD9E4" },
};

const SINODICO = 29.530588853; // dias de uma lua nova até a próxima
const LUA_NOVA_REF = Date.UTC(2000, 0, 6, 18, 14); // lua nova de 6/jan/2000

export type FaseLua = { idade: number; fracao: number; iluminacao: number; nome: string; crescente: boolean };

export function faseDaLua(data: string | Date): FaseLua | null {
  const d = typeof data === "string" ? new Date(data + "T12:00:00") : data;
  if (isNaN(d.getTime())) return null;
  const dias = (d.getTime() - LUA_NOVA_REF) / 86400000;
  const idade = ((dias % SINODICO) + SINODICO) % SINODICO;
  const fracao = idade / SINODICO;
  const iluminacao = (1 - Math.cos(2 * Math.PI * fracao)) / 2;
  // quartos e cheia/nova ocupam ~2 dias em volta do momento exato; o resto é crescente/gibosa
  const nome =
    idade < 1 ? "Lua Nova"
    : idade < 6.38 ? "Lua Crescente"
    : idade < 8.38 ? "Quarto Crescente"
    : idade < 13.77 ? "Crescente Gibosa"
    : idade < 15.77 ? "Lua Cheia"
    : idade < 21.15 ? "Minguante Gibosa"
    : idade < 23.15 ? "Quarto Minguante"
    : idade < 28.53 ? "Lua Minguante"
    : "Lua Nova";
  return { idade, fracao, iluminacao, nome, crescente: fracao < 0.5 };
}

// frase curtinha pra cada fase
export const FRASE_LUA: Record<string, string> = {
  "Lua Nova": "a lua estava escondida, guardando o começo da gente",
  "Lua Crescente": "a lua estava crescendo, igual a gente",
  "Quarto Crescente": "metade da lua acesa, e o resto a gente completou",
  "Crescente Gibosa": "a lua quase cheia, que nem meu coração",
  "Lua Cheia": "a lua estava cheia, iluminando o nosso começo",
  "Minguante Gibosa": "ainda bem clarinha, olhando pela gente",
  "Quarto Minguante": "meia lua no céu, e a gente inteiro",
  "Lua Minguante": "uma lua fininha, testemunha do nosso começo",
};

function rng(seed: string) {
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) s = ((s ^ seed.charCodeAt(i)) * 16777619) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export default function RetroMoon({ date, colors, id, width = "100%" }: { date: string; colors: Colors; id: string; width?: string }) {
  const fase = faseDaLua(date);
  const C = 150;
  const R = 70; // raio da lua
  const r = rng(date + id);
  const estrelas: { x: number; y: number; s: number; o: number; tw: boolean }[] = [];
  while (estrelas.length < 90) {
    const x = r() * 300, y = r() * 300;
    const dist = Math.hypot(x - C, y - C);
    if (dist > 133 || dist < R + 12) continue;
    estrelas.push({ x, y, s: r() > 0.93 ? 1.6 : 0.4 + r() * 0.8, o: 0.35 + r() * 0.6, tw: r() > 0.85 });
  }

  // parte iluminada: meio disco do lado aceso + elipse do "terminador"
  let iluminada = "";
  if (fase) {
    const k = Math.cos(2 * Math.PI * fase.fracao);
    const rx = Math.max(0.01, R * Math.abs(k));
    const ladoAceso = fase.crescente ? 1 : 0;
    const terminador = fase.crescente ? (k > 0 ? 0 : 1) : k < 0 ? 0 : 1;
    iluminada = `M ${C} ${C - R} A ${R} ${R} 0 0 ${ladoAceso} ${C} ${C + R} A ${rx} ${R} 0 0 ${terminador} ${C} ${C - R} Z`;
  }
  const crateras = [
    [-22, -18, 13], [18, -30, 8], [26, 10, 15], [-10, 26, 10], [-34, 8, 7], [6, -4, 6], [36, -12, 5],
  ];

  return (
    <svg viewBox="0 0 300 300" style={{ width, height: "auto", display: "block" }} role="img" aria-label={fase ? `${fase.nome}, ${Math.round(fase.iluminacao * 100)}% iluminada` : "Lua"}>
      <defs>
        <radialGradient id={`lua-ceu-${id}`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={colors.sky1} />
          <stop offset="100%" stopColor={colors.sky2} />
        </radialGradient>
        <radialGradient id={`lua-brilho-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor={colors.moon} stopOpacity="0.35" />
          <stop offset="100%" stopColor={colors.moon} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`lua-luz-${id}`} cx="40%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor={colors.moon} />
        </radialGradient>
        <clipPath id={`lua-disco-${id}`}>
          <circle cx={C} cy={C} r={R} />
        </clipPath>
      </defs>
      <circle cx={C} cy={C} r={142} fill="none" stroke={colors.ring} strokeWidth="1.2" opacity="0.7" />
      <circle cx={C} cy={C} r={136} fill={`url(#lua-ceu-${id})`} />
      {estrelas.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill={colors.star} opacity={s.o}>
          {s.tw && <animate attributeName="opacity" values={`${s.o};0.1;${s.o}`} dur={`${2 + (i % 4)}s`} repeatCount="indefinite" />}
        </circle>
      ))}
      {fase && fase.iluminacao > 0.3 && <circle cx={C} cy={C} r={R * 1.6} fill={`url(#lua-brilho-${id})`} opacity={fase.iluminacao} />}
      {/* lado escuro */}
      <circle cx={C} cy={C} r={R} fill={colors.shade} />
      {/* lado aceso */}
      {iluminada && <path d={iluminada} fill={`url(#lua-luz-${id})`} />}
      {/* crateras (só aparecem na parte acesa, por baixo da sombra dá um relevo leve) */}
      <g clipPath={`url(#lua-disco-${id})`} opacity="0.16">
        {crateras.map(([dx, dy, cr], i) => (
          <circle key={i} cx={C + dx} cy={C + dy} r={cr} fill="#6B6A7A" />
        ))}
      </g>
      <circle cx={C} cy={C} r={R} fill="none" stroke={colors.moon} strokeOpacity="0.25" strokeWidth="1" />
    </svg>
  );
}

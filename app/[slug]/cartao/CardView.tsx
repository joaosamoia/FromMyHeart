// app/[slug]/cartao/CardView.tsx
// Cartõezinhos com o QR Code (adicional pago da Retrospectiva): pequenos e
// objetivos, pra colar no presente, pôr dentro do buquê ou entregar na mão.
// O foco é o QR; o texto é uma frase curta que a pessoa escolhe.
//
// Modelos (tamanho real na impressão):
//   polaroid  70 × 86 mm   QR numa moldura branca + frase escrita à mão
//   fita      70 × 86 mm   a mesma polaroid, presa com fita no papel kraft
//   vale      90 × 58 mm   vale-presente mini
//   etiqueta  55 × 92 mm   tag pra amarrar no presente (para / de)
//   adesivo   70 × 70 mm   redondo, pra colar no embrulho
//   minimal   62 × 80 mm   só o QR, o ano e os nomes
//
// Na impressão saem 4 cópias numa folha A4, com linha de corte — funciona em
// qualquer impressora (de casa ou da gráfica) e sobra cartão reserva.
import type { CouplePageDoc } from "@/types/page";
import QRCode from "qrcode";
import { headers } from "next/headers";
import PrintButton from "./PrintButton";

const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 .13 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;
const HAND = "'Caveat', 'Segoe Print', cursive";
const TYPE = "'Special Elite', 'Courier New', monospace";
const SERIF = "'Playfair Display', Georgia, serif";
const BOLD = "'Bricolage Grotesque', Inter, sans-serif";

export const MODELOS = [
  { id: "polaroid", nome: "Polaroid", w: 70, h: 86 },
  { id: "fita", nome: "Polaroid com fita", w: 70, h: 86 },
  { id: "vale", nome: "Vale-presente", w: 90, h: 58 },
  { id: "etiqueta", nome: "Etiqueta", w: 55, h: 92 },
  { id: "adesivo", nome: "Adesivo redondo", w: 70, h: 70 },
  { id: "minimal", nome: "Minimal", w: 62, h: 80 },
] as const;
export type ModeloId = (typeof MODELOS)[number]["id"];

// [linha 1, linha 2 (destacada)] — curtas, cabem embaixo do QR
export const FRASES: [string, string][] = [
  ["aponta a câmera aqui", "tem uma surpresa pra você"],
  ["abre quando estiver comigo", "que eu quero ver a sua cara"],
  ["o nosso {ano} inteirinho", "tá aqui dentro ♥"],
  ["antes de abrir o presente", "abre isso aqui"],
  ["aperta o play", "a nossa trilha tá tocando"],
  ["não abre sem mim", "me chama primeiro ♥"],
];

const LOOKS = {
  kraft: { paper: "#C9A378", ink: "#33241A", accent: "#B8473B", tape: "rgba(242,232,206,.92)" },
  sol: { paper: "#F6C453", ink: "#2B2420", accent: "#E4572E", tape: "rgba(160,214,205,.92)" },
};

type Dados = { qr: string; foto?: string; nomeA: string; nomeB: string; ano: number | string; frase: [string, string]; L: (typeof LOOKS)["kraft"] };

function Qr({ svg, foto, fundo = "#FFFFFF" }: { svg: string; foto?: string; fundo?: string }) {
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1" }}>
      <div role="img" aria-label="QR Code da retrospectiva" style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg width="100%" height="100%" ') }} />
      {foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" style={{ position: "absolute", top: "50%", left: "50%", width: "23%", height: "23%", transform: "translate(-50%,-50%)", borderRadius: "50%", border: `1.6cqw solid ${fundo}`, objectFit: "cover", background: fundo }} />
      )}
    </div>
  );
}

function Frase({ frase, cor, tam = 7.6 }: { frase: [string, string]; cor: string; tam?: number }) {
  return (
    <div style={{ fontFamily: HAND, fontSize: `${tam}cqw`, lineHeight: 1.08, textAlign: "center" }}>
      {frase[0]}
      <br />
      <span style={{ color: cor }}>{frase[1]}</span>
    </div>
  );
}

const base: React.CSSProperties = { position: "relative", width: "100%", height: "100%", overflow: "hidden", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" };

// ── Polaroid (a referência) ──
function Polaroid({ qr, foto, frase, L }: Dados) {
  return (
    <div style={{ ...base, background: "#FFFEFA", color: "#2B2420", padding: "6cqw 6cqw 4cqw", justifyContent: "space-between" }}>
      <Qr svg={qr} foto={foto} fundo="#FFFEFA" />
      <Frase frase={frase} cor={L.accent} />
    </div>
  );
}

// ── Polaroid com fita, no papel kraft/amarelo ──
function Fita({ qr, foto, frase, L }: Dados) {
  return (
    <div style={{ ...base, background: L.paper, backgroundImage: NOISE, justifyContent: "center", padding: "7cqw" }}>
      <div style={{ position: "relative", width: "100%", background: "#FFFEFA", color: L.ink, padding: "5cqw 5cqw 3.5cqw", boxShadow: "0 1.5cqw 4cqw rgba(0,0,0,.22)", transform: "rotate(-2deg)" }}>
        <span style={{ position: "absolute", top: "-3cqw", left: "50%", marginLeft: "-12cqw", width: "24cqw", height: "6.5cqw", background: L.tape, transform: "rotate(4deg)" }} />
        <Qr svg={qr} foto={foto} fundo="#FFFEFA" />
        <div style={{ marginTop: "2.5cqw" }}>
          <Frase frase={frase} cor={L.accent} tam={7} />
        </div>
      </div>
    </div>
  );
}

// ── Vale-presente mini (horizontal) ──
function Vale({ qr, nomeA, nomeB, ano }: Dados) {
  const rosa = "#E8336D";
  const vinho = "#2B0B3F";
  return (
    <div style={{ ...base, background: "#FFF4F7", color: vinho, flexDirection: "row", gap: "4cqw", padding: "5cqw", border: `1.2cqw solid ${rosa}`, outline: `0.5cqw dashed ${vinho}`, outlineOffset: "-3.4cqw" }}>
      <div style={{ width: "40%", flexShrink: 0, alignSelf: "center", background: "#fff", padding: "2cqw", borderRadius: "1.5cqw" }}>
        <Qr svg={qr} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        <div style={{ fontFamily: BOLD, fontWeight: 800, fontSize: "3.3cqw", letterSpacing: "0.22em", color: rosa }}>VALE-PRESENTE</div>
        <div style={{ fontFamily: BOLD, fontWeight: 800, fontSize: "7.2cqw", lineHeight: 0.98, letterSpacing: "-0.02em", marginTop: "1.5cqw" }}>
          1 viagem pelo
          <br />
          nosso {ano}
        </div>
        <div style={{ fontSize: "3.2cqw", marginTop: "2.5cqw", lineHeight: 1.35 }}>
          para <b>{nomeA}</b> · de <b>{nomeB || "mim"}</b>
        </div>
        <div style={{ fontFamily: TYPE, fontSize: "2.6cqw", marginTop: "2.5cqw", opacity: 0.75 }}>resgate: aponte a câmera · validade: pra sempre</div>
      </div>
    </div>
  );
}

// ── Etiqueta de presente ──
function Etiqueta({ qr, foto, nomeA, nomeB, frase }: Dados) {
  const tinta = "#2F2A26";
  return (
    <div
      style={{
        ...base,
        background: "#F4E9D8",
        backgroundImage: NOISE,
        color: tinta,
        clipPath: "polygon(24% 0, 76% 0, 100% 13%, 100% 100%, 0 100%, 0 13%)",
        padding: "20cqw 8cqw 6cqw",
        justifyContent: "space-between",
      }}
    >
      <span style={{ position: "absolute", top: "6cqw", left: "50%", width: "8cqw", height: "8cqw", marginLeft: "-4cqw", borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 1.6cqw #C9B48F" }} />
      <div style={{ width: "100%", fontFamily: TYPE, fontSize: "4.4cqw", lineHeight: 1.75 }}>
        <div style={{ borderBottom: `0.5cqw solid ${tinta}33` }}>
          para: <span style={{ fontFamily: HAND, fontSize: "8cqw" }}>{nomeA}</span>
        </div>
        <div style={{ borderBottom: `0.5cqw solid ${tinta}33` }}>
          de: <span style={{ fontFamily: HAND, fontSize: "8cqw" }}>{nomeB || "eu"}</span>
        </div>
      </div>
      <div style={{ width: "86%", background: "#fff", padding: "3cqw" }}>
        <Qr svg={qr} foto={foto} />
      </div>
      <Frase frase={frase} cor="#2F6B4F" tam={7.4} />
    </div>
  );
}

// ── Adesivo redondo ──
function Adesivo({ qr, foto, frase, L }: Dados) {
  const id = "arco";
  return (
    <div style={{ ...base, borderRadius: "50%", background: L.accent, justifyContent: "center" }}>
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
        <defs>
          <path id={`${id}-t`} d="M 14 50 A 36 36 0 0 1 86 50" />
          <path id={`${id}-b`} d="M 11 50 A 39 39 0 0 0 89 50" />
        </defs>
        <text fill="#FFF8EE" fontSize="6.4" fontFamily={HAND} fontWeight={700} textAnchor="middle">
          <textPath href={`#${id}-t`} startOffset="50%">{frase[0]}</textPath>
        </text>
        <text fill="#FFF8EE" fontSize="6.4" fontFamily={HAND} fontWeight={700} textAnchor="middle">
          <textPath href={`#${id}-b`} startOffset="50%">{frase[1]}</textPath>
        </text>
      </svg>
      <div style={{ width: "52%", background: "#fff", padding: "3.5cqw", borderRadius: "3cqw", position: "relative" }}>
        <Qr svg={qr} foto={foto} />
      </div>
    </div>
  );
}

// ── Minimal ──
function Minimal({ qr, nomeA, nomeB, ano }: Dados) {
  return (
    <div style={{ ...base, background: "#F5F1EA", color: "#141414", padding: "8cqw 9cqw 7cqw", justifyContent: "space-between" }}>
      <Qr svg={qr} fundo="#F5F1EA" />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: SERIF, fontSize: "13cqw", lineHeight: 1 }}>{ano}</div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "6cqw", marginTop: "1cqw" }}>
          {nomeA} & {nomeB || "eu"}
        </div>
        <div style={{ fontSize: "3cqw", letterSpacing: "0.3em", marginTop: "2.5cqw", opacity: 0.6 }}>APONTE A CÂMERA</div>
      </div>
    </div>
  );
}

const TINTA: Record<ModeloId, string> = { polaroid: "", fita: "", vale: "#2B0B3F", etiqueta: "#2F2A26", adesivo: "", minimal: "#141414" };
const FUNDO_QR: Record<ModeloId, string> = { polaroid: "#FFFEFA", fita: "#FFFEFA", vale: "#FFFFFF", etiqueta: "#FFFFFF", adesivo: "#FFFFFF", minimal: "#F5F1EA" };
const COMPONENTE = { polaroid: Polaroid, fita: Fita, vale: Vale, etiqueta: Etiqueta, adesivo: Adesivo, minimal: Minimal };
const USA_FRASE = new Set<ModeloId>(["polaroid", "fita", "etiqueta", "adesivo"]);

export default async function CardView({
  page,
  slug,
  modelo = "polaroid",
  frase: fraseParam,
  baseHref,
}: {
  page: Partial<CouplePageDoc>;
  slug: string;
  modelo?: string;
  frase?: string;
  baseHref: string;
}) {
  const M = MODELOS.find((x) => x.id === modelo) ?? MODELOS[0];
  const m = M.id as ModeloId;
  const fi = Math.min(FRASES.length - 1, Math.max(0, Number(fraseParam) || 0));
  const L = page.theme === "scrap-sol" || page.theme === "scrap-rosa" || page.theme === "scrap-creme" ? LOOKS.sol : LOOKS.kraft;
  // O QR de CADA cliente aponta pro link da página dele: domínio + /slug.
  // Sem a NEXT_PUBLIC_SITE_URL na Vercel, usa o domínio de onde o cartão foi
  // aberto — assim o QR nunca sai sem domínio (o que não abriria nada).
  const h = await headers();
  const origem =
    (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "") ||
    `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "datecriativo.fun"}`;
  const url = `${origem}/${slug}`;
  const foto = page.qrPhoto || page.retroCover || page.retroMonths?.find((x) => x.photo)?.photo;
  const ano = page.retroYear ?? new Date().getFullYear();
  const qr = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "H", margin: 0, color: { dark: TINTA[m] || L.ink, light: FUNDO_QR[m] } });
  const frase = FRASES[fi].map((t) => t.replace("{ano}", String(ano))) as [string, string];
  const dados: Dados = { qr, foto, nomeA: page.retroNameA?.trim() || "você", nomeB: page.retroNameB?.trim() || "", ano, frase, L };
  const Cartao = COMPONENTE[m];
  const link = (mod: string, f: number) => `${baseHref}${baseHref.includes("?") ? "&" : "?"}modelo=${mod}&frase=${f}`;

  // tamanho na tela: proporcional ao real (1 mm ≈ 4,4 px), sem passar da tela
  const larguraTela = `min(88vw, ${Math.round(M.w * 4.4)}px)`;
  const cartao = (
    <div className="cartao" style={{ width: larguraTela, aspectRatio: `${M.w} / ${M.h}`, containerType: "inline-size", flexShrink: 0, boxShadow: "0 14px 32px rgba(0,0,0,.22)", borderRadius: m === "adesivo" ? "50%" : 0 }}>
      <Cartao {...dados} />
    </div>
  );

  const chip = (ativo: boolean): React.CSSProperties => ({
    flexShrink: 0,
    padding: "8px 13px",
    borderRadius: 99,
    textDecoration: "none",
    fontSize: 13.5,
    fontWeight: 600,
    background: ativo ? "#33241A" : "#FFF8EE",
    color: ativo ? "#FFF8EE" : "#33241A",
    border: "1.5px solid #33241A",
    whiteSpace: "nowrap",
  });

  return (
    <main style={{ minHeight: "100vh", background: "#E9E2D6", display: "flex", flexDirection: "column", alignItems: "center", padding: "26px 16px 40px", gap: 18, fontFamily: "Inter, sans-serif", color: "#33241A" }}>
      <style>{`
        @page { size: A4; margin: 12mm; }
        .folha { display: none; }
        .rolar::-webkit-scrollbar { display: none; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          main { padding: 0 !important; background: none !important; min-height: 0 !important; display: block !important; }
          .folha { display: grid !important; grid-template-columns: repeat(2, ${M.w}mm); gap: 10mm; justify-content: center; }
          .folha .cartao { width: ${M.w}mm !important; height: ${M.h}mm !important; box-shadow: none !important; outline: 0.25mm dashed #9a9a9a; outline-offset: 1.5mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print" style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ fontFamily: HAND, fontSize: 30, lineHeight: 1 }}>o seu QR Code ♥</div>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: "8px 0 0", color: "#6B5B4E" }}>
          Escolha o modelo e a frase. Saem 4 cópias numa folha A4, no tamanho certo ({M.w / 10} × {M.h / 10} cm): é só recortar na linha.
        </p>
      </div>

      <nav className="no-print rolar" aria-label="Modelo" style={{ display: "flex", gap: 8, overflowX: "auto", maxWidth: "min(100%, 640px)", padding: "2px 4px 4px", scrollbarWidth: "none" }}>
        {MODELOS.map((x) => (
          <a key={x.id} href={link(x.id, fi)} aria-current={x.id === m ? "true" : undefined} style={chip(x.id === m)}>
            {x.nome}
          </a>
        ))}
      </nav>

      <div className="no-print" style={{ padding: "8px 0" }}>{cartao}</div>

      {USA_FRASE.has(m) && (
        <div className="no-print" style={{ width: "min(100%, 460px)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#6B5B4E", margin: "0 0 8px", textAlign: "center" }}>FRASE</div>
          <div style={{ display: "grid", gap: 6 }}>
            {FRASES.map((f, i) => (
              <a key={i} href={link(m, i)} aria-current={i === fi ? "true" : undefined} style={{ ...chip(i === fi), borderRadius: 12, fontWeight: 500, whiteSpace: "normal", textAlign: "center" }}>
                {f[0].replace("{ano}", String(ano))} · <b>{f[1]}</b>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* o que sai na impressora */}
      <div className="folha" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>{cartao}</div>
        ))}
      </div>

      <PrintButton color="#FFF8EE" ink="#33241A" />
      <p className="no-print" style={{ fontSize: 12.5, color: "#6B5B4E", maxWidth: 360, textAlign: "center", lineHeight: 1.5, margin: 0 }}>
        Dica: teste o QR com a câmera do seu celular antes de entregar. Fica lindo em papel fotográfico, couchê 250 g ou papel adesivo (pro adesivo redondo).
      </p>
    </main>
  );
}

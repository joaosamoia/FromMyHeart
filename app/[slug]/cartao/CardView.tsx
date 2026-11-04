// app/[slug]/cartao/CardView.tsx
// O cartão com QR Code pra imprimir (adicional pago da Retrospectiva), em
// vários modelos. A pessoa escolhe o que combina com o presente que vai junto:
//
//   polaroid  · QR numa polaroid com fita (padrão, segue o visual da página)
//   ingresso  · ingresso de cinema "sessão especial: o nosso ano"
//   carta     · carta com selo de cera: "abra só quando estiver comigo"
//   vale      · vale-presente pra resgatar
//   disco     · disco de vinil, "lado A: o nosso ano"
//   etiqueta  · tag de presente pra amarrar na caixa ou no buquê
//   minimal   · elegante, preto e off-white
//
// Tamanho A6 (10,5 × 14,8 cm) na impressão. Tudo dimensionado em cqw (largura
// do cartão), então o que aparece na tela é exatamente o que sai na impressora.
import type { CouplePageDoc } from "@/types/page";
import QRCode from "qrcode";
import PrintButton from "./PrintButton";

const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 .13 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;
const HAND = "'Caveat', 'Segoe Print', cursive";
const TYPE = "'Special Elite', 'Courier New', monospace";
const SERIF = "'Playfair Display', Georgia, serif";
const POSTER = "'Abril Fatface', 'Playfair Display', Georgia, serif";

export const MODELOS = [
  { id: "polaroid", nome: "Polaroid", desc: "a foto e o QR numa polaroid" },
  { id: "ingresso", nome: "Ingresso", desc: "sessão especial de cinema" },
  { id: "carta", nome: "Carta", desc: "com selo de cera" },
  { id: "vale", nome: "Vale-presente", desc: "pra resgatar" },
  { id: "disco", nome: "Disco", desc: "lado A: o nosso ano" },
  { id: "etiqueta", nome: "Etiqueta", desc: "pra amarrar no presente" },
  { id: "minimal", nome: "Minimal", desc: "preto e off-white" },
] as const;
export type ModeloId = (typeof MODELOS)[number]["id"];

const LOOKS = {
  kraft: { paper: "#C9A378", ink: "#33241A", soft: "#5E4634", accent: "#B8473B", tape: "rgba(242,232,206,.9)" },
  sol: { paper: "#F6C453", ink: "#2B2420", soft: "#6B5B4E", accent: "#E4572E", tape: "rgba(160,214,205,.9)" },
};

type Dados = {
  qr: string; // svg pronto
  foto?: string;
  nomeA: string;
  nomeB: string;
  ano: number | string;
  desde: string; // "10/03/2024" ou ""
  L: (typeof LOOKS)["kraft"];
};

// ── peças comuns ──
function Qr({ svg, foto, fundo = "#FFFEFA", borda }: { svg: string; foto?: string; fundo?: string; borda?: string }) {
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1" }}>
      <div role="img" aria-label="QR Code da retrospectiva" style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg width="100%" height="100%" ') }} />
      {foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" style={{ position: "absolute", top: "50%", left: "50%", width: "24%", height: "24%", transform: "translate(-50%,-50%)", borderRadius: "50%", border: `1.3cqw solid ${borda ?? fundo}`, objectFit: "cover", background: fundo }} />
      )}
    </div>
  );
}

const cartaoBase: React.CSSProperties = {
  position: "relative",
  width: "min(92vw, 400px)",
  aspectRatio: "105 / 148",
  boxShadow: "0 18px 40px rgba(0,0,0,.25)",
  overflow: "hidden",
  containerType: "inline-size",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

// ── 1. Polaroid (o original) ──
function Polaroid({ qr, foto, nomeA, nomeB, ano, L }: Dados) {
  return (
    <div className="card" style={{ ...cartaoBase, backgroundColor: L.paper, backgroundImage: NOISE, color: L.ink, justifyContent: "space-between", padding: "7cqw 7cqw 6cqw" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "1.4cqw 5cqw", background: L.tape, fontFamily: TYPE, fontSize: "3.8cqw", letterSpacing: "0.06em", transform: "rotate(-2deg)" }}>a nossa retrospectiva de {ano}</div>
        <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: "11cqw", lineHeight: 1, marginTop: "3.5cqw" }}>
          pra você, {nomeA} <span style={{ color: L.accent }}>♥</span>
        </div>
      </div>
      <div style={{ position: "relative", width: "66cqw", background: "#FFFEFA", padding: "4cqw 4cqw 3cqw", boxShadow: "0 1.5cqw 4cqw rgba(0,0,0,.25)", transform: "rotate(-2deg)" }}>
        <span style={{ position: "absolute", top: "-2.6cqw", left: "50%", marginLeft: "-9cqw", width: "18cqw", height: "5.2cqw", background: L.tape, transform: "rotate(4deg)" }} />
        <Qr svg={qr} foto={foto} />
        <div style={{ fontFamily: HAND, fontSize: "6.4cqw", textAlign: "center", marginTop: "2.5cqw", lineHeight: 1.05 }}>
          aponta a câmera aqui
          <br />
          <span style={{ color: L.accent }}>tem uma surpresa pra você</span>
        </div>
      </div>
      <div style={{ fontFamily: HAND, fontSize: "6.4cqw", alignSelf: "flex-end", transform: "rotate(-3deg)" }}>{nomeB ? `com amor, ${nomeB}` : "com amor ♥"}</div>
    </div>
  );
}

// ── 2. Ingresso de cinema ──
function Ingresso({ qr, foto, nomeA, nomeB, ano, desde }: Dados) {
  const vinho = "#7A1730";
  const creme = "#FBF1DE";
  const furo = (lado: "left" | "right") => (
    <span style={{ position: "absolute", [lado]: "-4cqw", top: "62%", width: "8cqw", height: "8cqw", borderRadius: "50%", background: vinho }} />
  );
  return (
    <div className="card" style={{ ...cartaoBase, background: vinho, padding: "6cqw", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", background: creme, color: vinho, borderRadius: "3cqw", display: "flex", flexDirection: "column", alignItems: "center", padding: "6cqw 6cqw 5cqw", boxSizing: "border-box", backgroundImage: NOISE }}>
        {furo("left")}
        {furo("right")}
        <div style={{ fontFamily: TYPE, fontSize: "3.4cqw", letterSpacing: "0.35em" }}>★ ADMIT ONE ★</div>
        <div style={{ fontFamily: POSTER, fontSize: "11.5cqw", lineHeight: 0.95, textAlign: "center", marginTop: "3cqw" }}>
          Sessão
          <br />
          especial
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "5cqw", marginTop: "2cqw" }}>o nosso {ano}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", width: "100%", marginTop: "4cqw", borderTop: `0.5cqw solid ${vinho}`, borderBottom: `0.5cqw solid ${vinho}`, padding: "2cqw 0", fontFamily: TYPE, fontSize: "2.7cqw", textAlign: "center", lineHeight: 1.3 }}>
          <span>
            SALA
            <br />
            <b style={{ fontSize: "4cqw" }}>♥</b>
          </span>
          <span>
            FILA
            <br />
            <b style={{ fontSize: "4cqw" }}>A</b>
          </span>
          <span>
            POLTRONA
            <br />
            <b style={{ fontSize: "4cqw" }}>{nomeA.toUpperCase().slice(0, 8)}</b>
          </span>
        </div>
        {/* picote */}
        <div style={{ width: "112%", margin: "auto 0 5cqw", borderTop: `0.6cqw dashed ${vinho}`, opacity: 0.55 }} />
        <div style={{ width: "54cqw", padding: "2.5cqw", background: "#FFFEFA", borderRadius: "2cqw" }}>
          <Qr svg={qr} foto={foto} />
        </div>
        <div style={{ fontFamily: TYPE, fontSize: "3cqw", margin: "3cqw 0 auto", textAlign: "center", lineHeight: 1.4 }}>
          aponte a câmera · a sessão começa agora
          <br />
          {desde ? `em cartaz desde ${desde}` : nomeB ? `um filme de ${nomeB}` : "um filme de nós dois"}
        </div>
      </div>
    </div>
  );
}

// ── 3. Carta com selo de cera ──
function Carta({ qr, foto, nomeA, nomeB, ano }: Dados) {
  const papel = "#FFF8EC";
  const tinta = "#3A2620";
  const cera = "#A8243A";
  return (
    <div className="card" style={{ ...cartaoBase, background: "#E8D9C4", padding: "6cqw", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", background: papel, backgroundImage: `${NOISE}, repeating-linear-gradient(transparent 0 7.6cqw, rgba(120,90,70,.12) 7.6cqw 7.8cqw)`, color: tinta, boxShadow: "0 1cqw 3cqw rgba(0,0,0,.12)", padding: "8cqw 7cqw 6cqw", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: HAND, fontSize: "9cqw", lineHeight: 1 }}>{nomeA},</div>
        <div style={{ fontFamily: HAND, fontSize: "6.2cqw", lineHeight: 1.22, marginTop: "3cqw" }}>
          eu guardei o nosso {ano} inteirinho num lugar só. Abre quando estiver comigo, que eu quero ver a sua cara. ♥
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "4cqw" }}>
          <div style={{ width: "48cqw", padding: "2.5cqw", background: "#fff", boxShadow: "0 0.6cqw 2cqw rgba(0,0,0,.12)", transform: "rotate(-1.5deg)" }}>
            <Qr svg={qr} foto={foto} fundo="#fff" />
          </div>
          <div style={{ textAlign: "right", fontFamily: HAND, fontSize: "6cqw", lineHeight: 1.1, paddingBottom: "1cqw" }}>
            com amor,
            <br />
            <b>{nomeB || "eu"}</b>
          </div>
        </div>
        {/* selo de cera */}
        <div style={{ position: "absolute", top: "-6cqw", right: "6cqw", width: "20cqw", height: "20cqw", borderRadius: "48% 52% 50% 50%", background: `radial-gradient(circle at 35% 30%, #D0475C, ${cera} 55%, #6E1222)`, boxShadow: "0 1cqw 2.5cqw rgba(0,0,0,.3), inset 0 0 0 1.6cqw rgba(255,255,255,.08)", display: "grid", placeItems: "center", color: "#F6C5CD", fontFamily: SERIF, fontSize: "8cqw", fontWeight: 700 }}>
          ♥
        </div>
      </div>
    </div>
  );
}

// ── 4. Vale-presente ──
function Vale({ qr, foto, nomeA, nomeB, ano }: Dados) {
  const rosa = "#E8336D";
  const vinho = "#2B0B3F";
  return (
    <div className="card" style={{ ...cartaoBase, background: rosa, padding: "5cqw", justifyContent: "center" }}>
      <div style={{ width: "100%", height: "100%", border: `0.9cqw dashed ${vinho}`, borderRadius: "4cqw", background: "#FFF4F7", color: vinho, padding: "7cqw 6cqw 5cqw", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', Inter, sans-serif", fontWeight: 800, fontSize: "4cqw", letterSpacing: "0.3em", color: rosa }}>VALE-PRESENTE</div>
        <div style={{ fontFamily: "'Bricolage Grotesque', Inter, sans-serif", fontWeight: 800, fontSize: "10cqw", lineHeight: 0.95, letterSpacing: "-0.03em", marginTop: "3cqw" }}>
          vale 1 viagem
          <br />
          pelo nosso {ano}
        </div>
        <div style={{ fontSize: "3.6cqw", marginTop: "2.5cqw", opacity: 0.8 }}>
          para <b>{nomeA}</b> · de <b>{nomeB || "mim"}</b>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: "56cqw", padding: "3cqw", background: "#fff", borderRadius: "3cqw", boxShadow: `0 1.2cqw 0 ${vinho}` }}>
          <Qr svg={qr} foto={foto} fundo="#fff" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "5cqw", fontFamily: TYPE, fontSize: "2.8cqw", opacity: 0.75 }}>
          <span>resgate: aponte a câmera</span>
          <span>validade: pra sempre</span>
        </div>
      </div>
    </div>
  );
}

// ── 5. Disco de vinil ──
function Disco({ qr, foto, nomeA, nomeB, ano }: Dados) {
  const fundo = "#1D1426";
  const amarelo = "#FFD23F";
  return (
    <div className="card" style={{ ...cartaoBase, background: fundo, color: "#FFF4F7", padding: "7cqw 7cqw 6cqw", justifyContent: "space-between" }}>
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", fontFamily: TYPE, fontSize: "3cqw", letterSpacing: "0.12em", opacity: 0.8 }}>
        <span>LADO A</span>
        <span>{ano} · 33⅓ RPM</span>
      </div>
      {/* o disco */}
      <div style={{ position: "relative", width: "62cqw", height: "62cqw", borderRadius: "50%", background: "repeating-radial-gradient(circle, #111 0 0.7cqw, #1c1c1c 0.7cqw 1.2cqw)", boxShadow: "0 2cqw 5cqw rgba(0,0,0,.5), inset 0 0 0 0.6cqw #2a2a2a" }}>
        <div style={{ position: "absolute", inset: "18cqw", borderRadius: "50%", background: amarelo, display: "grid", placeItems: "center", overflow: "hidden" }}>
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ color: fundo, fontFamily: POSTER, fontSize: "6cqw" }}>♥</span>
          )}
        </div>
        <span style={{ position: "absolute", top: "50%", left: "50%", width: "2.6cqw", height: "2.6cqw", margin: "-1.3cqw", borderRadius: "50%", background: fundo }} />
      </div>
      <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "5cqw" }}>
        <div style={{ width: "34cqw", flexShrink: 0, padding: "2.4cqw", background: "#FFFEFA", borderRadius: "2cqw" }}>
          <Qr svg={qr} />
        </div>
        <div>
          <div style={{ fontFamily: POSTER, fontSize: "7.6cqw", lineHeight: 1 }}>o nosso {ano}</div>
          <div style={{ fontSize: "3.6cqw", marginTop: "1.5cqw", opacity: 0.8, lineHeight: 1.35 }}>
            faixa 01 · {nomeA} & {nomeB || "eu"}
          </div>
          <div style={{ fontSize: "3.4cqw", marginTop: "2.5cqw", color: amarelo, fontWeight: 700 }}>▶ aponte a câmera e dê play</div>
        </div>
      </div>
    </div>
  );
}

// ── 6. Etiqueta de presente ──
function Etiqueta({ qr, foto, nomeA, nomeB, ano }: Dados) {
  const papel = "#F4E9D8";
  const tinta = "#2F2A26";
  const verde = "#2F6B4F";
  return (
    <div className="card" style={{ ...cartaoBase, background: "#E9E2D6", justifyContent: "center", padding: "5cqw 12cqw" }}>
      {/* barbante */}
      <span style={{ position: "absolute", top: 0, left: "50%", width: "0.7cqw", height: "12cqw", marginLeft: "-0.35cqw", background: "#B68B5E" }} />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: papel,
          backgroundImage: NOISE,
          color: tinta,
          clipPath: "polygon(22% 0, 78% 0, 100% 11%, 100% 100%, 0 100%, 0 11%)",
          padding: "18cqw 7cqw 7cqw",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* furo com ilhós */}
        <span style={{ position: "absolute", top: "5cqw", left: "50%", width: "7cqw", height: "7cqw", marginLeft: "-3.5cqw", borderRadius: "50%", background: "#E9E2D6", boxShadow: `0 0 0 1.3cqw #C9B48F` }} />
        <div style={{ fontFamily: TYPE, fontSize: "3.6cqw", lineHeight: 1.7, width: "100%", textAlign: "left" }}>
          <div style={{ borderBottom: `0.4cqw solid ${tinta}33` }}>
            para: <span style={{ fontFamily: HAND, fontSize: "6.6cqw" }}>{nomeA}</span>
          </div>
          <div style={{ borderBottom: `0.4cqw solid ${tinta}33` }}>
            de: <span style={{ fontFamily: HAND, fontSize: "6.6cqw" }}>{nomeB || "eu"}</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: "52cqw", padding: "2.5cqw", background: "#FFFEFA" }}>
          <Qr svg={qr} foto={foto} />
        </div>
        <div style={{ fontFamily: HAND, fontSize: "6.4cqw", lineHeight: 1.05, marginTop: "3cqw" }}>
          antes de abrir o presente,
          <br />
          <span style={{ color: verde }}>abre o nosso {ano} ♥</span>
        </div>
      </div>
    </div>
  );
}

// ── 7. Minimal ──
function Minimal({ qr, nomeA, nomeB, ano, desde }: Dados) {
  const off = "#F5F1EA";
  const preto = "#141414";
  return (
    <div className="card" style={{ ...cartaoBase, background: off, color: preto, padding: "11cqw 9cqw 9cqw", justifyContent: "space-between" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.8cqw", letterSpacing: "0.45em", textTransform: "uppercase" }}>retrospectiva</div>
        <div style={{ fontFamily: SERIF, fontSize: "24cqw", lineHeight: 0.9, fontWeight: 500, marginTop: "3cqw" }}>{ano}</div>
        <div style={{ width: "10cqw", height: "0.4cqw", background: preto, margin: "5cqw auto 4cqw" }} />
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "6.4cqw" }}>
          {nomeA} & {nomeB || "eu"}
        </div>
        {desde && <div style={{ fontSize: "2.8cqw", letterSpacing: "0.2em", marginTop: "2cqw", opacity: 0.65 }}>DESDE {desde}</div>}
      </div>
      <div style={{ width: "40cqw" }}>
        <Qr svg={qr} fundo={off} />
      </div>
      <div style={{ fontSize: "2.8cqw", letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.7 }}>aponte a câmera</div>
    </div>
  );
}

// cor dos quadradinhos do QR em cada modelo (sempre escura sobre fundo claro:
// QR invertido ou colorido demais falha em muita câmera)
const TINTA: Record<ModeloId, string> = {
  polaroid: "", // usa a do tema
  ingresso: "#5A0F22",
  carta: "#3A2620",
  vale: "#2B0B3F",
  disco: "#1D1426",
  etiqueta: "#2F2A26",
  minimal: "#141414",
};
const FUNDO_QR: Record<ModeloId, string> = {
  polaroid: "#FFFEFA",
  ingresso: "#FFFEFA",
  carta: "#FFFFFF",
  vale: "#FFFFFF",
  disco: "#FFFEFA",
  etiqueta: "#FFFEFA",
  minimal: "#F5F1EA",
};

export default async function CardView({ page, slug, modelo = "polaroid", baseHref }: { page: Partial<CouplePageDoc>; slug: string; modelo?: string; baseHref: string }) {
  const m: ModeloId = (MODELOS.find((x) => x.id === modelo)?.id ?? "polaroid") as ModeloId;
  const L = page.theme === "scrap-sol" || page.theme === "scrap-rosa" || page.theme === "scrap-creme" ? LOOKS.sol : LOOKS.kraft;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${slug}`;
  const foto = page.qrPhoto || page.retroCover || page.retroMonths?.find((x) => x.photo)?.photo;
  const tinta = TINTA[m] || L.ink;
  const qr = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "H", margin: 0, color: { dark: tinta, light: FUNDO_QR[m] } });
  const desde = page.startDate ? page.startDate.split("-").reverse().join("/") : "";
  const dados: Dados = { qr, foto, nomeA: page.retroNameA?.trim() || "você", nomeB: page.retroNameB?.trim() || "", ano: page.retroYear ?? new Date().getFullYear(), desde, L };
  const Cartao = { polaroid: Polaroid, ingresso: Ingresso, carta: Carta, vale: Vale, disco: Disco, etiqueta: Etiqueta, minimal: Minimal }[m];
  const sep = baseHref.includes("?") ? "&" : "?";

  return (
    <main style={{ minHeight: "100vh", background: "#E9E2D6", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 16px 40px", gap: 20, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @page { size: 105mm 148mm; margin: 0; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          main { padding: 0 !important; background: none !important; min-height: 0 !important; }
          .card { box-shadow: none !important; transform: none !important; width: 105mm !important; height: 148mm !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .mod::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="no-print" style={{ textAlign: "center", maxWidth: 400, color: "#3A2A1E" }}>
        <div style={{ fontFamily: HAND, fontSize: 30, lineHeight: 1 }}>o seu cartão com QR Code ♥</div>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: "10px 0 0", color: "#6B5B4E" }}>
          Escolha o modelo que combina com o presente. Imprima em papel fotográfico ou cartão, tamanho A6 (10,5 × 14,8 cm), ou 2 por folha A4 e recorte.
        </p>
      </div>

      {/* escolha do modelo */}
      <nav className="no-print mod" aria-label="Modelos de cartão" style={{ display: "flex", gap: 8, overflowX: "auto", maxWidth: "min(100%, 640px)", padding: "2px 4px 6px", scrollbarWidth: "none" }}>
        {MODELOS.map((x) => {
          const ativo = x.id === m;
          return (
            <a
              key={x.id}
              href={`${baseHref}${sep}modelo=${x.id}`}
              aria-current={ativo ? "true" : undefined}
              style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 12, textDecoration: "none", background: ativo ? "#33241A" : "#FFF8EE", color: ativo ? "#FFF8EE" : "#33241A", border: "1.5px solid #33241A", lineHeight: 1.2 }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>{x.nome}</div>
              <div style={{ fontSize: 11.5, opacity: 0.75 }}>{x.desc}</div>
            </a>
          );
        })}
      </nav>

      <Cartao {...dados} />

      <PrintButton color="#FFF8EE" ink="#33241A" />
      <p className="no-print" style={{ fontSize: 12.5, color: "#6B5B4E", maxWidth: 360, textAlign: "center", lineHeight: 1.5, margin: 0 }}>
        Dica: antes de entregar, teste o QR com a câmera do seu celular. Na gráfica rápida, peça “papel couchê 250 g, tamanho A6”.
      </p>
    </main>
  );
}

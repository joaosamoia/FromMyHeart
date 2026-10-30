// app/[slug]/cartao/CardView.tsx
// O cartão em si (separado da rota pra dar pra pré-visualizar com dados de exemplo).
import type { CouplePageDoc } from "@/types/page";
import QRCode from "qrcode";
import PrintButton from "./PrintButton";

const NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 .13 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;
const HAND = "'Caveat', 'Segoe Print', cursive";
const TYPE = "'Special Elite', 'Courier New', monospace";

const LOOKS = {
  kraft: { paper: "#C9A378", ink: "#33241A", soft: "#5E4634", accent: "#B8473B", tape: "rgba(242,232,206,.9)" },
  sol: { paper: "#F6C453", ink: "#2B2420", soft: "#6B5B4E", accent: "#E4572E", tape: "rgba(160,214,205,.9)" },
};

// QR gerado aqui mesmo, em SVG (nítido na impressão e sem depender de serviço
// externo). Correção de erro "H" deixa espaço pra foto no meio sem quebrar a leitura.
export default async function CardView({ page, slug }: { page: Partial<CouplePageDoc>; slug: string }) {
  const L = page.theme === "scrap-sol" || page.theme === "scrap-rosa" || page.theme === "scrap-creme" ? LOOKS.sol : LOOKS.kraft;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${slug}`;
  const foto = page.qrPhoto || page.retroCover || page.retroMonths?.find((m) => m.photo)?.photo;
  const nomeA = page.retroNameA?.trim() || "você";
  const nomeB = page.retroNameB?.trim() || "";
  const qrSvg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "H", margin: 0, color: { dark: L.ink, light: "#FFFEFA" } });
  return (
    <main style={{ minHeight: "100vh", background: "#E9E2D6", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 16px 40px", gap: 22, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @page { size: 105mm 148mm; margin: 0; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          main { padding: 0 !important; background: none !important; min-height: 0 !important; }
          .card { box-shadow: none !important; transform: none !important; width: 105mm !important; height: 148mm !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print" style={{ textAlign: "center", maxWidth: 380, color: "#3A2A1E" }}>
        <div style={{ fontFamily: HAND, fontSize: 30, lineHeight: 1 }}>o seu cartão com QR Code ♥</div>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: "10px 0 0", color: "#6B5B4E" }}>
          Imprima em papel fotográfico ou cartão, no tamanho A6 (10,5 × 14,8 cm) — ou 2 por folha A4 e recorte. Entregue junto do presente: o QR abre a retrospectiva.
        </p>
      </div>

      {/* o cartão */}
      <div
        className="card"
        style={{
          position: "relative",
          width: "min(92vw, 400px)",
          aspectRatio: "105 / 148",
          backgroundColor: L.paper,
          backgroundImage: NOISE,
          color: L.ink,
          boxShadow: "0 18px 40px rgba(0,0,0,.25)",
          overflow: "hidden",
          containerType: "inline-size",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7cqw 7cqw 6cqw",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "1.4cqw 5cqw", background: L.tape, fontFamily: TYPE, fontSize: "3.8cqw", letterSpacing: "0.06em", transform: "rotate(-2deg)" }}>
            a nossa retrospectiva de {page.retroYear}
          </div>
          <div style={{ fontFamily: HAND, fontWeight: 700, fontSize: "11cqw", lineHeight: 1, marginTop: "3.5cqw" }}>
            pra você, {nomeA} <span style={{ color: L.accent }}>♥</span>
          </div>
        </div>

        {/* QR numa polaroid */}
        <div style={{ position: "relative", width: "66cqw", background: "#FFFEFA", padding: "4cqw 4cqw 3cqw", boxShadow: "0 1.5cqw 4cqw rgba(0,0,0,.25)", transform: "rotate(-2deg)" }}>
          <span style={{ position: "absolute", top: "-2.6cqw", left: "50%", marginLeft: "-9cqw", width: "18cqw", height: "5.2cqw", background: L.tape, transform: "rotate(4deg)" }} />
          <div style={{ position: "relative", width: "100%", aspectRatio: "1" }}>
            <div role="img" aria-label="QR Code da retrospectiva" style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: qrSvg.replace("<svg ", '<svg width="100%" height="100%" ') }} />
            {foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" style={{ position: "absolute", top: "50%", left: "50%", width: "24%", height: "24%", transform: "translate(-50%,-50%)", borderRadius: "50%", border: "1.4cqw solid #FFFEFA", objectFit: "cover" }} />
            )}
          </div>
          <div style={{ fontFamily: HAND, fontSize: "6.4cqw", textAlign: "center", marginTop: "2.5cqw", lineHeight: 1.05 }}>
            aponta a câmera aqui
            <br />
            <span style={{ color: L.accent }}>tem uma surpresa pra você</span>
          </div>
        </div>

        <div style={{ fontFamily: HAND, fontSize: "6.4cqw", alignSelf: "flex-end", transform: "rotate(-3deg)" }}>{nomeB ? `com amor, ${nomeB}` : "com amor ♥"}</div>
      </div>

      <PrintButton color="#FFF8EE" ink="#33241A" />
    </main>
  );
}

"use client";

// Botão de imprimir/salvar em PDF do cartão com QR Code.
// No celular, "Imprimir" abre o menu do sistema, que também salva em PDF.
export default function PrintButton({ color, ink }: { color: string; ink: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print"
      style={{ padding: "14px 26px", border: "none", borderRadius: 6, background: ink, color, fontFamily: "'Special Elite', 'Courier New', monospace", fontSize: 16, letterSpacing: 1, cursor: "pointer", boxShadow: "3px 4px 0 rgba(0,0,0,.2)" }}
    >
      imprimir ou salvar em PDF ♥
    </button>
  );
}

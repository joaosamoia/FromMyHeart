"use client";

// app/obrigado/page.tsx
// Onde o cliente cai depois de pagar na Kiwify. É AQUI que ele recebe o
// produto de fato: o link pronto, com botão de copiar, compartilhar e o QR.
//
// O e-mail continua sendo a rede de segurança (funciona mesmo se ele fechar a
// aba), mas esta tela é a entrega imediata — sem ela, a pessoa paga e fica
// sem saber o que fazer, que é a maior causa de pedido de reembolso.
//
// Como o webhook da Kiwify pode demorar alguns segundos pra confirmar, a
// página fica consultando o Firestore até o status virar "pago", em vez de
// mostrar um erro que assustaria quem acabou de pagar.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BR, D_FONT, BRAND_CSS, Blobs, Logo } from "@/components/brand";

// Fundo vinho com manchas de cor (paleta Paixão), cartão claro no meio.
const B = {
  blush: BR.blush,
  cream: BR.cream,
  ink: BR.wine,
  muted: BR.mutedInk,
  rose: BR.pink,
  roseSoft: BR.line,
  ok: BR.ok,
};

export default function ObrigadoPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: BR.wine }} />}>
      <ObrigadoInner />
    </Suspense>
  );
}

function ObrigadoInner() {
  const params = useSearchParams();
  // o slug pode vir pela URL (?s= ou ?s1=) ou, se a Kiwify não repassar nada,
  // do próprio aparelho (gravado pelo quiz antes de ir pro checkout)
  const [slug] = useState(() => {
    const fromUrl = params.get("s") || params.get("s1");
    if (fromUrl) return fromUrl;
    try {
      return typeof window !== "undefined" ? localStorage.getItem("fmh_last_slug") ?? "" : "";
    } catch {
      return "";
    }
  });
  const [estado, setEstado] = useState<"conferindo" | "pago" | "pendente" | "erro">("conferindo");
  const [titulo, setTitulo] = useState("");
  const [temCartao, setTemCartao] = useState(false);
  const [ehRetro, setEhRetro] = useState(false);
  const [tentativas, setTentativas] = useState(0);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const pageUrl = `${siteUrl}/${slug}`;

  useEffect(() => {
    if (!slug) {
      setEstado("erro");
      return;
    }
    let ativo = true;
    let tentou = 0;

    const conferir = async () => {
      try {
        const snap = await getDoc(doc(db, "pages", slug));
        if (!ativo) return;
        if (!snap.exists()) {
          setEstado("erro");
          return;
        }
        const dados = snap.data();
        setTitulo(dados.title || "");
        setTemCartao(dados.style === "retro" && !!dados.qrPaid);
        setEhRetro(dados.style === "retro");
        if (dados.status === "pago") {
          setEstado("pago");
          return;
        }
        // Ainda não confirmou: tenta de novo por ~40s antes de desistir.
        tentou++;
        setTentativas(tentou);
        if (tentou < 20) setTimeout(conferir, 2000);
        else setEstado("pendente");
      } catch {
        if (ativo) setEstado("erro");
      }
    };

    conferir();
    return () => {
      ativo = false;
    };
  }, [slug]);

  return (
    <main
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
        background: BR.wine,
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px 18px 44px",
      }}
    >
      <style>{BRAND_CSS}</style>
      <Blobs a={BR.pink} b={BR.orange} opacity={0.45} />
      <div style={{ position: "relative", marginBottom: 22 }}>
        <Logo size={30} />
      </div>
      <div className="br-pop" style={{ position: "relative", width: "100%", maxWidth: 440, textAlign: "center", background: BR.cream, borderRadius: 28, padding: "30px 22px 28px", boxShadow: `0 8px 0 ${BR.night}` }}>
        {estado === "conferindo" && <Conferindo tentativas={tentativas} />}
        {estado === "pago" && <Pronto pageUrl={pageUrl} titulo={titulo} temCartao={temCartao} ehRetro={ehRetro} />}
        {estado === "pendente" && <Pendente />}
        {estado === "erro" && <Erro />}
      </div>
    </main>
  );
}

function Conferindo({ tentativas }: { tentativas: number }) {
  return (
    <>
      <style>{`@keyframes girar{to{transform:rotate(360deg)}} @keyframes pulsar{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
      <div style={{ fontSize: 46, animation: "pulsar 1.6s ease-in-out infinite" }}>💌</div>
      <h1 style={{ fontFamily: D_FONT, fontWeight: 800, letterSpacing: "-0.02em", fontSize: 28, color: B.ink, margin: "16px 0 8px" }}>
        Confirmando seu pagamento...
      </h1>
      <p style={{ fontSize: 14.5, color: B.muted, lineHeight: 1.5, margin: 0 }}>
        Isso leva poucos segundos. Não feche esta página.
      </p>
      <div style={{ margin: "26px auto 0", width: 30, height: 30, borderRadius: "50%", border: `3px solid ${B.roseSoft}`, borderTopColor: B.rose, animation: "girar .9s linear infinite" }} />
      {tentativas > 6 && (
        <p style={{ fontSize: 12.5, color: B.muted, marginTop: 20 }}>
          Ainda processando… às vezes o Pix demora um pouquinho mais.
        </p>
      )}
    </>
  );
}

function Pronto({ pageUrl, titulo, temCartao, ehRetro }: { pageUrl: string; titulo: string; temCartao: boolean; ehRetro: boolean }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
    }
  };

  const compartilhar = async () => {
    const texto = `Fiz uma coisa pra você 💕\n${pageUrl}`;
    // Web Share API abre o menu nativo do celular (WhatsApp, Instagram, SMS…).
    // No desktop quase nunca existe, então caímos no WhatsApp Web.
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo || "Uma surpresa pra você", text: texto });
        return;
      } catch {
        /* usuário cancelou — segue pro fallback */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(pageUrl)}`;

  return (
    <>
      <div style={{ fontSize: 46 }}>🎉</div>
      <h1 style={{ fontFamily: D_FONT, fontWeight: 800, letterSpacing: "-0.03em", fontSize: 40, color: B.ink, margin: "14px 0 6px", lineHeight: 1.25 }}>
        Está pronto!
      </h1>
      <p style={{ fontSize: 14.5, color: B.muted, lineHeight: 1.5, margin: "0 0 22px" }}>
        {titulo ? `“${titulo}” já está no ar.` : "Sua página já está no ar."} Agora é só mandar pra pessoa.
      </p>

      {/* o link */}
      <div style={{ background: "#fff", border: `1.5px solid ${B.roseSoft}`, borderRadius: 18, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: B.muted, marginBottom: 8 }}>SEU LINK</div>
        <div
          style={{
            fontSize: 13.5,
            color: B.ink,
            wordBreak: "break-all",
            background: B.blush,
            borderRadius: 10,
            padding: "11px 12px",
            lineHeight: 1.4,
          }}
        >
          {pageUrl}
        </div>

        <button
          onClick={copiar}
          style={{
            width: "100%",
            marginTop: 10,
            padding: "13px",
            borderRadius: 12,
            border: `1.5px solid ${copiado ? B.ok : B.roseSoft}`,
            background: copiado ? "#E6F5F0" : "#fff",
            color: copiado ? B.ok : B.ink,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {copiado ? "✓ Link copiado!" : "Copiar link"}
        </button>
      </div>

      <button
        onClick={compartilhar}
        style={{
          width: "100%",
          marginTop: 12,
          padding: "16px",
          borderRadius: 14,
          border: "none",
          background: B.rose,
          color: "#fff",
          fontSize: 18,
          fontWeight: 800,
          cursor: "pointer",
          fontFamily: D_FONT,
          boxShadow: `0 5px 0 ${BR.wine}`,
        }}
      >
        Enviar agora 💌
      </button>

      <Link
        href={pageUrl}
        target="_blank"
        style={{ display: "block", marginTop: 14, fontSize: 14, color: B.rose, fontWeight: 600, textDecoration: "none" }}
      >
        Ver como ficou →
      </Link>

      {temCartao && (
        <Link
          href={`${pageUrl}/cartao`}
          target="_blank"
          style={{ display: "block", marginTop: 16, padding: "14px", borderRadius: 14, border: `1.5px dashed ${B.rose}`, color: B.ink, fontSize: 14.5, fontWeight: 700, textDecoration: "none", background: "#fff" }}
        >
          💌 Imprimir o cartão com QR Code
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: B.muted, marginTop: 3 }}>pra entregar em mãos junto do presente</span>
        </Link>
      )}

      {/* QR simples pra imprimir — na Retrospectiva o QR é o adicional pago (cartão) */}
      {!ehRetro && (
        <div style={{ marginTop: 30, paddingTop: 24, borderTop: `1px solid ${B.roseSoft}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code da sua página" width={130} height={130} style={{ borderRadius: 12, background: "#fff", padding: 8 }} />
          <p style={{ fontSize: 12.5, color: B.muted, marginTop: 10, lineHeight: 1.5 }}>
            Segure a imagem pra salvar. Dá pra imprimir e entregar em mãos.
          </p>
        </div>
      )}

      <p style={{ fontSize: 12.5, color: B.muted, marginTop: 26, lineHeight: 1.5 }}>
        Também mandamos esse link no seu e-mail — guarde pra acessar quando quiser.
      </p>
    </>
  );
}

function Pendente() {
  return (
    <>
      <div style={{ fontSize: 46 }}>⏳</div>
      <h1 style={{ fontFamily: D_FONT, fontWeight: 800, letterSpacing: "-0.02em", fontSize: 28, color: B.ink, margin: "16px 0 8px" }}>
        Quase lá
      </h1>
      <p style={{ fontSize: 14.5, color: B.muted, lineHeight: 1.55, margin: 0 }}>
        Seu pagamento ainda está sendo confirmado. Assim que cair, você recebe o link no e-mail
        automaticamente — pode fechar esta página tranquilo.
      </p>
    </>
  );
}

function Erro() {
  return (
    <>
      <div style={{ fontSize: 46 }}>🔎</div>
      <h1 style={{ fontFamily: D_FONT, fontWeight: 800, letterSpacing: "-0.02em", fontSize: 28, color: B.ink, margin: "16px 0 8px" }}>
        Não encontramos essa página
      </h1>
      <p style={{ fontSize: 14.5, color: B.muted, lineHeight: 1.55, margin: "0 0 20px" }}>
        Se você acabou de pagar, confira seu e-mail — o link foi enviado pra lá.
      </p>
      <Link href="/" style={{ fontSize: 14, color: B.rose, fontWeight: 700, textDecoration: "none" }}>
        Voltar ao início
      </Link>
    </>
  );
}

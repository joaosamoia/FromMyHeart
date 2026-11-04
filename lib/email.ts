// lib/email.ts
// E-mail de confirmação — dispara assim que o webhook confirma o pagamento,
// com o link direto da página. É a rede de segurança da entrega: garante que o
// cliente recebe o produto mesmo se fechar a aba, trocar de app pra pagar via
// Pix, ou a sessão cair no meio do caminho.
//
// O texto muda conforme o produto: quem comprou um convite de date não deveria
// receber um e-mail falando "sua página de amor está pronta".
import { Resend } from "resend";
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}
type Produto = "classica" | "date" | "retro";
const TEXTOS: Record<Produto, { assunto: string; emoji: string; titulo: string; linha: string; botao: string; accent: string; bg: string }> = {
  classica: {
    assunto: "Seu pedido: o link da sua página de amor",
    emoji: "💌",
    titulo: "Prontinho",
    linha: "já está no ar e pronta pra emocionar.",
    botao: "Ver minha página",
    accent: "#DE6E7C",
    bg: "#FEEBE4",
  },
  date: {
    assunto: "Seu pedido: o link do seu convite",
    emoji: "",
    titulo: "Pronto",
    linha: "está no ar. Agora é só mandar pra pessoa e esperar a resposta.",
    botao: "Ver meu convite",
    accent: "#F94C12",
    bg: "#FFF1E9",
  },
  retro: {
    assunto: "Seu pedido: o link da retrospectiva de vocês",
    emoji: "🎞️",
    titulo: "Prontinho",
    linha: "está no ar. Manda o link e deixa a pessoa reviver o ano de vocês.",
    botao: "Ver a retrospectiva",
    accent: "#E8336D",
    bg: "#FFE9F0",
  },
};
export async function sendPageReadyEmail(params: {
  to: string;
  buyerName: string;
  pageTitle: string;
  pageUrl: string;
  produto?: Produto;
  cardUrl?: string; // cartão com QR pra imprimir (adicional da Retrospectiva)
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de confirmação NÃO enviado.");
    return;
  }
  const { to, buyerName, pageTitle, pageUrl, produto = "classica", cardUrl } = params;
  const T = TEXTOS[produto] ?? TEXTOS.classica;
  const nome = buyerName?.trim() ? buyerName.trim().split(" ")[0] : "";
  const titulo = pageTitle?.trim() ? `“${pageTitle.trim()}”` : produto === "date" ? "Seu convite" : produto === "retro" ? "A retrospectiva" : "Sua página";
  try {
    await resend.emails.send({
      // ⚠️ Enquanto o domínio próprio não estiver verificado no Resend, use
      // "onboarding@resend.dev" (funciona sem configuração, ótimo pra lançar
      // rápido). Depois de verificar seu domínio, troque por algo como
      // "contato@seusite.com" — melhora a entregabilidade e a marca.
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to,
      // e-mail de pedido (transacional): assunto direto, sem emoji, versão em
      // texto puro e resposta pra uma pessoa — tudo isso ajuda o Gmail a pôr
      // na caixa Principal em vez de Promoções.
      ...(process.env.RESEND_REPLY_TO ? { replyTo: process.env.RESEND_REPLY_TO } : {}),
      subject: T.assunto,
      text: [
        `${T.titulo}${nome ? `, ${nome}` : ""}!`,
        "",
        `${titulo} ${T.linha}`,
        "",
        `Link: ${pageUrl}`,
        ...(cardUrl ? ["", `Cartão com QR Code pra imprimir: ${cardUrl}`] : []),
        "",
        "Guarde este e-mail: é assim que você acessa seu link sempre que quiser.",
      ].join("\n"),
      html: `
        <div style="font-family:Georgia,'Times New Roman',serif;max-width:480px;margin:0 auto;padding:34px 26px;background:${T.bg};border-radius:18px;">
          ${T.emoji ? `<div style="text-align:center;font-size:40px;line-height:1;">${T.emoji}</div>` : ""}
          <h1 style="text-align:center;color:#3A241F;font-size:23px;margin:16px 0 10px;">
            ${T.titulo}${nome ? `, ${nome}` : ""}!
          </h1>
          <p style="text-align:center;color:#9C7E78;font-size:15px;line-height:1.55;margin:0;">
            ${titulo} ${T.linha}
          </p>
          <div style="text-align:center;margin:30px 0 18px;">
            <a href="${pageUrl}" style="display:inline-block;padding:15px 30px;background:${T.accent};color:#fff;text-decoration:none;border-radius:99px;font-weight:bold;font-family:Arial,sans-serif;font-size:15px;">
              ${T.botao}
            </a>
          </div>
          <p style="text-align:center;color:#9C7E78;font-size:13px;word-break:break-all;font-family:Arial,sans-serif;margin:0;">
            ${pageUrl}
          </p>
          ${
            cardUrl
              ? `<p style="text-align:center;margin:22px 0 0;font-family:Arial,sans-serif;font-size:14px;"><a href="${cardUrl}" style="color:${T.accent};font-weight:bold;">💌 Imprimir o cartão com QR Code</a><br/><span style="color:#9C7E78;font-size:12.5px;">pra entregar em mãos junto do presente</span></p>`
              : ""
          }
          <p style="text-align:center;color:#B79B95;font-size:12px;margin-top:26px;font-family:Arial,sans-serif;line-height:1.5;">
            Guarde este e-mail — é assim que você acessa seu link sempre que quiser.
          </p>
        </div>
      `,
    });
  } catch (err) {
    // Nunca deixamos uma falha de e-mail quebrar a confirmação do pagamento —
    // o pagamento e a liberação da página já foram salvos no Firestore antes
    // desta chamada. Só registramos o erro pra investigar depois.
    console.error("Falha ao enviar e-mail de confirmação:", err);
  }
}

// E-mail "continue de onde parou": a pessoa salvou o rascunho no /criar e quer
// terminar depois (ou em outro aparelho). O link reabre o formulário com tudo
// preenchido, inclusive as fotos que já subiram.
export async function sendDraftEmail(params: { to: string; nome?: string; link: string; produto?: Produto }) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de rascunho não enviado.");
    return false;
  }
  const { to, nome, link, produto = "classica" } = params;
  const oQue = produto === "retro" ? "a retrospectiva de vocês" : produto === "date" ? "o seu convite" : "a sua página";
  const primeiro = nome?.trim() ? nome.trim().split(" ")[0] : "";
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject: "Seu presente ficou salvo ♥ continue quando quiser",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#FFF1F5;border-radius:18px;color:#3A1430;">
          <div style="text-align:center;font-size:36px;line-height:1;">💾</div>
          <h1 style="text-align:center;font-size:22px;margin:14px 0 8px;">Tá salvo${primeiro ? `, ${primeiro}` : ""}!</h1>
          <p style="text-align:center;font-size:15px;line-height:1.55;color:#7A4B6B;margin:0;">
            Guardamos tudo o que você já preencheu de ${oQue} — textos, músicas e fotos.
            Toque no botão pra continuar de onde parou, em qualquer celular ou computador.
          </p>
          <div style="text-align:center;margin:28px 0 16px;">
            <a href="${link}" style="display:inline-block;padding:15px 30px;background:#E8336D;color:#fff;text-decoration:none;border-radius:99px;font-weight:bold;font-size:15px;">Continuar meu presente</a>
          </div>
          <p style="text-align:center;font-size:12px;color:#A07A92;word-break:break-all;margin:0;">${link}</p>
          <p style="text-align:center;font-size:12px;color:#A07A92;margin-top:22px;line-height:1.5;">Não compartilhe este link: ele abre o seu rascunho.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("Falha ao enviar e-mail de rascunho:", err);
    return false;
  }
}

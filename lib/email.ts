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

type Produto = "classica" | "date";

const TEXTOS: Record<Produto, { assunto: string; emoji: string; titulo: string; linha: string; botao: string; accent: string; bg: string }> = {
  classica: {
    assunto: "Sua página de amor está pronta! 💕",
    emoji: "💌",
    titulo: "Prontinho",
    linha: "já está no ar e pronta pra emocionar.",
    botao: "Ver minha página",
    accent: "#DE6E7C",
    bg: "#FEEBE4",
  },
  date: {
    assunto: "Seu convite está pronto! 🐧",
    emoji: "🐧",
    titulo: "Bora nesse date",
    linha: "está no ar. Agora é só mandar pra pessoa e esperar a resposta.",
    botao: "Ver meu convite",
    accent: "#F94C12",
    bg: "#FFF1E9",
  },
};

export async function sendPageReadyEmail(params: {
  to: string;
  buyerName: string;
  pageTitle: string;
  pageUrl: string;
  produto?: Produto;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de confirmação NÃO enviado.");
    return;
  }

  const { to, buyerName, pageTitle, pageUrl, produto = "classica" } = params;
  const T = TEXTOS[produto] ?? TEXTOS.classica;
  const nome = buyerName?.trim() ? buyerName.trim().split(" ")[0] : "";
  const titulo = pageTitle?.trim() ? `“${pageTitle.trim()}”` : produto === "date" ? "Seu convite" : "Sua página";

  try {
    await resend.emails.send({
      // ⚠️ Enquanto o domínio próprio não estiver verificado no Resend, use
      // "onboarding@resend.dev" (funciona sem configuração, ótimo pra lançar
      // rápido). Depois de verificar seu domínio, troque por algo como
      // "contato@seusite.com" — melhora a entregabilidade e a marca.
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject: T.assunto,
      html: `
        <div style="font-family:Georgia,'Times New Roman',serif;max-width:480px;margin:0 auto;padding:34px 26px;background:${T.bg};border-radius:18px;">
          <div style="text-align:center;font-size:40px;line-height:1;">${T.emoji}</div>
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

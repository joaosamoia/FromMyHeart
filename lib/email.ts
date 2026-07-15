// lib/email.ts
// Envio do e-mail de confirmação — dispara assim que o webhook confirma o
// pagamento, com o link direto da página. Isso é o que garante que o cliente
// SEMPRE recebe o produto, mesmo se fechar a aba do navegador, trocar de app
// pra pagar via Pix, ou a sessão cair no meio do caminho.

import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendPageReadyEmail(params: {
  to: string;
  buyerName: string;
  pageTitle: string;
  pageUrl: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada — e-mail de confirmação NÃO enviado.");
    return;
  }

  const { to, buyerName, pageTitle, pageUrl } = params;

  try {
    await resend.emails.send({
      // ⚠️ Enquanto o domínio próprio não estiver verificado no Resend, use
      // "onboarding@resend.dev" (funciona sem configuração, ótimo pra lançar
      // rápido). Depois de verificar seu domínio, troque por algo como
      // "contato@seusite.com" — melhora a entregabilidade e a marca.
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject: "Sua página de amor está pronta! 💕",
      html: `
        <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fdf1f6;border-radius:16px;">
          <div style="text-align:center;font-size:32px;">♥</div>
          <h1 style="text-align:center;color:#2c2333;font-size:22px;">Prontinho, ${buyerName}!</h1>
          <p style="text-align:center;color:#a493ad;font-size:15px;line-height:1.5;">
            "${pageTitle}" já está no ar e pronta pra emocionar.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${pageUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#f871a8,#ec4b93);color:#fff;text-decoration:none;border-radius:99px;font-weight:600;">
              Ver minha página
            </a>
          </div>
          <p style="text-align:center;color:#a493ad;font-size:13px;word-break:break-all;">${pageUrl}</p>
          <p style="text-align:center;color:#c9a2b4;font-size:12px;margin-top:24px;">
            Guarde este e-mail — é assim que você acessa sua página sempre que quiser.
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

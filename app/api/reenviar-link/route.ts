// app/api/reenviar-link/route.ts
// "Não recebi meu link": a pessoa digita o e-mail da compra.
//   • só o e-mail → a gente manda de novo, PRA ESSE E-MAIL, o link de cada
//     página paga dela (e o do cartão QR). Resposta sempre igual, exista
//     compra ou não (não dá pra "testar" e-mails dos outros).
//   • e-mail + 4 últimos dígitos do celular da compra → além do e-mail, os
//     links aparecem NA TELA na hora (as duas coisas juntas só o comprador sabe).
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendPageReadyEmail } from "@/lib/email";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let email = "";
  let fone4 = "";
  try {
    const body = JSON.parse((await req.text()).slice(0, 500) || "{}");
    email = String(body.email ?? "").trim();
    fone4 = String(body.fone4 ?? "").replace(/\D/g, "").slice(-4);
  } catch {}
  if (!EMAIL.test(email)) return NextResponse.json({ error: "e-mail inválido" }, { status: 400 });

  const db = getAdminDb();
  const chave = crypto.createHash("sha1").update(email.toLowerCase()).digest("hex");
  const trava = db.collection("reenvios").doc(chave);
  try {
    // no máximo 1 reenvio a cada 3 min por e-mail
    const t = await trava.get();
    const recente = t.exists && Date.now() - (t.data()?.em ?? 0) < 3 * 60_000;
    const tentativas = recente ? Number(t.data()?.n ?? 0) + 1 : 1;
    // trava contra chute dos 4 dígitos: no máximo 5 tentativas a cada 3 min
    if (tentativas > 5) return NextResponse.json({ ok: true, links: [] });
    await trava.set({ em: recente ? t.data()?.em : Date.now(), n: tentativas });

    const variantes = [...new Set([email, email.toLowerCase()])];
    const snap = await db.collection("pages").where("buyerEmail", "in", variantes).get();
    const pagas = snap.docs
      .map((d) => ({ ...(d.data() as Record<string, any>), slug: d.id }) as Record<string, any>)
      .filter((p) => p.status === "pago")
      .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0))
      .slice(0, 3);

    const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/+$/, "");

    // com os 4 dígitos certos, devolve os links pra mostrar na tela
    if (fone4.length === 4) {
      const minhas = pagas.filter((p) => String(p.buyerPhone ?? "").replace(/\D/g, "").endsWith(fone4));
      if (minhas.length) {
        return NextResponse.json({
          ok: true,
          links: minhas.map((p) => ({
            url: `${site}/${p.slug}`,
            titulo: p.title || p.slug,
            cartao: p.style === "retro" && p.qrPaid ? `${site}/${p.slug}/cartao` : null,
          })),
        });
      }
    }
    if (recente) return NextResponse.json({ ok: true, links: [] }); // e-mail já foi há pouco
    for (const p of pagas) {
      await sendPageReadyEmail({
        to: email,
        buyerName: p.buyerName || "",
        pageTitle: p.title || "",
        pageUrl: `${site}/${p.slug}`,
        produto: p.style === "date" ? "date" : p.style === "retro" ? "retro" : "classica",
        cardUrl: p.style === "retro" && p.qrPaid ? `${site}/${p.slug}/cartao` : undefined,
      });
    }
    console.log(`[reenviar-link] ${pagas.length} página(s) reenviada(s).`);
  } catch (err) {
    console.error("[reenviar-link] falhou:", err);
  }
  return NextResponse.json({ ok: true, links: [] });
}

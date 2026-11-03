// app/api/rascunho/route.ts
// Rascunho do /criar salvo na nuvem (além do localStorage). Assim a pessoa não
// perde nada se trocar de aparelho, limpar o navegador ou abrir o link do
// Instagram/TikTok (que usa um navegador próprio e apaga tudo ao fechar).
//
//   POST { id, step, d, email?, enviarEmail? }  → salva (e manda o link por e-mail)
//   GET  ?id=...                                → devolve { d, step }
//
// O id é aleatório (24 caracteres) e só quem tem o link consegue abrir.
// Grava via Admin SDK, então não precisa mudar as regras do Firestore.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendDraftEmail } from "@/lib/email";
import { contarEvento } from "@/lib/funil-server";

const ID = /^[A-Za-z0-9]{24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITE = 250_000; // ~250 KB: só texto e links de fotos, nunca a foto em si

function produtoDe(style: unknown) {
  return style === "retro" ? "retro" : style === "date" ? "date" : "classica";
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > LIMITE) return NextResponse.json({ error: "rascunho grande demais" }, { status: 413 });
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { id, step, d, email, enviarEmail } = body ?? {};
  if (!ID.test(String(id)) || typeof d !== "object" || !d) return NextResponse.json({ error: "dados inválidos" }, { status: 400 });

  const ref = getAdminDb().collection("rascunhos").doc(id);
  const emailOk = typeof email === "string" && EMAIL.test(email.trim()) ? email.trim().toLowerCase() : null;
  const agora = Date.now();

  // nunca deixa o rascunho carregar campos de controle de pagamento
  const { status: _s, paidAt: _p, qrPaid: _q, astral: _a, ...limpo } = d as Record<string, unknown>;
  void _s; void _p; void _q; void _a;

  try {
    const snap = await ref.get();
    const antes = snap.data();
    await ref.set(
      {
        d: limpo,
        step: Number(step) || 0,
        produto: produtoDe(limpo.style),
        atualizadoEm: agora,
        ...(snap.exists ? {} : { criadoEm: agora }),
        ...(emailOk ? { email: emailOk } : {}),
      },
      { merge: true }
    );

    let emailEnviado = false;
    if (enviarEmail && emailOk) {
      // no máximo 1 e-mail a cada 10 min por rascunho (evita spam sem querer)
      if (!antes?.emailEnviadoEm || agora - antes.emailEnviadoEm > 10 * 60_000) {
        const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
        emailEnviado = await sendDraftEmail({
          to: emailOk,
          nome: String(limpo.buyerName || limpo.retroNameB || ""),
          link: `${site}/criar?rascunho=${id}`,
          produto: produtoDe(limpo.style),
        });
        if (emailEnviado) {
          await ref.set({ emailEnviadoEm: agora }, { merge: true });
          await contarEvento(produtoDe(limpo.style), "rascunho_email").catch(() => {});
        }
      } else {
        emailEnviado = true; // já foi enviado há pouco
      }
    }
    return NextResponse.json({ ok: true, emailEnviado });
  } catch (err) {
    console.error("[rascunho] falhou ao salvar:", err);
    return NextResponse.json({ error: "não foi possível salvar" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!ID.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  try {
    const snap = await getAdminDb().collection("rascunhos").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "rascunho não encontrado" }, { status: 404 });
    const { d, step } = snap.data() as { d: unknown; step: number };
    return NextResponse.json({ d, step });
  } catch (err) {
    console.error("[rascunho] falhou ao ler:", err);
    return NextResponse.json({ error: "não foi possível abrir" }, { status: 500 });
  }
}

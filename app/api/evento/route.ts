// app/api/evento/route.ts
// Recebe os eventos do funil (lib/funil.ts) e soma num contador por dia:
//   funil/2026-12-03 → { retro: { "inicio": 120, "etapa:03-casal": 95, ... } }
// Um documento por dia e só incrementos: barato, sem guardar nada pessoal.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { EVENTO_VALIDO } from "@/lib/funil";
import { contarEvento } from "@/lib/funil-server";

const PRODUTOS = new Set(["retro", "classica", "date"]);

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > 500) return NextResponse.json({ ok: false }, { status: 413 });
    const { produto, evento } = JSON.parse(raw || "{}");
    if (!PRODUTOS.has(produto) || typeof evento !== "string" || !EVENTO_VALIDO.test(evento)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await contarEvento(produto, evento);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Analytics nunca pode atrapalhar a compra: falhou, só registra.
    console.error("[evento] falhou:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

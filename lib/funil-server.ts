// lib/funil-server.ts — lado do servidor do funil (ver lib/funil.ts).
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

// Data no fuso de Brasília (o "dia" do painel bate com o seu dia).
export function diaBR(t = Date.now()) {
  return new Date(t - 3 * 3600_000).toISOString().slice(0, 10);
}

// funil/2026-12-03 → { retro: { "inicio": 120, "etapa:03-casal": 95, ... } }
export async function contarEvento(produto: string, evento: string) {
  await getAdminDb()
    .collection("funil")
    .doc(diaBR())
    .set({ [produto]: { [evento]: FieldValue.increment(1) }, atualizadoEm: Date.now() }, { merge: true });
}

// ["2026-12-03", "2026-12-02", ...] — os últimos `n` dias, do mais recente pro mais antigo
export function ultimosDias(n: number) {
  const agora = Date.now();
  return Array.from({ length: n }, (_, i) => diaBR(agora - i * 86400_000));
}

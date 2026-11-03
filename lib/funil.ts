// lib/funil.ts
// Eventos do funil do /criar: em qual etapa as pessoas entram, onde desistem e
// quantas chegam no pagamento. Roda no navegador e manda pro /api/evento, que
// soma tudo num contador por dia no Firestore (coleção `funil`). O painel fica
// em /admin/funil?chave=SUA_ADMIN_KEY.
//
// Se um dia você instalar o Pixel da Meta ou do TikTok, os mesmos eventos já
// são repassados pra eles (fbq / ttq), sem mexer em nada aqui.

export type Produto = "retro" | "classica" | "date";

// Só nomes simples (letras, números, _ : -): o servidor recusa o resto.
export const EVENTO_VALIDO = /^[a-z0-9_:-]{1,48}$/;

// Transforma "Músicas" em "musicas" pra usar no nome do evento.
export function slugEtapa(nome: string) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// Nome do evento de "viu a etapa N". O número na frente mantém a ordem certa
// no painel: etapa:01-estilo, etapa:02-visual, ...
export function eventoEtapa(i: number, nome: string) {
  return `etapa:${String(i + 1).padStart(2, "0")}-${slugEtapa(nome)}`;
}

type Win = Window & {
  fbq?: (...a: unknown[]) => void;
  ttq?: { track?: (...a: unknown[]) => void };
};

// `unico`: conta no máximo uma vez por sessão (ex.: ver a etapa 3 de novo
// depois de voltar não conta duas vezes — senão o funil fica inflado).
export function track(produto: Produto, evento: string, opts: { unico?: boolean } = {}) {
  if (typeof window === "undefined" || !EVENTO_VALIDO.test(evento)) return;
  try {
    if (opts.unico) {
      const k = "fmh_ev_" + produto;
      const vistos: string[] = JSON.parse(sessionStorage.getItem(k) || "[]");
      if (vistos.includes(evento)) return;
      sessionStorage.setItem(k, JSON.stringify([...vistos, evento].slice(-80)));
    }
  } catch {}
  const body = JSON.stringify({ produto, evento });
  try {
    if (!navigator.sendBeacon?.("/api/evento", new Blob([body], { type: "application/json" }))) {
      fetch("/api/evento", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {}
  try {
    const w = window as Win;
    w.fbq?.("trackCustom", "fmh_" + evento.replace(/[:-]/g, "_"), { produto });
    w.ttq?.track?.("fmh_" + evento.replace(/[:-]/g, "_"), { produto });
  } catch {}
}

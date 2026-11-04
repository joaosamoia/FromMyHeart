"use client";

// app/criar/fluxo.tsx
// Peças do formulário que existem pra a pessoa NÃO desistir no meio:
//   • quais etapas são opcionais e quanto tempo cada uma leva
//   • a barra de etapas clicável (dá pra pular e voltar depois)
//   • as dicas com exemplos de cada etapa
//   • "salvar e continuar depois" (rascunho na nuvem + link por e-mail)
//   • a lista do que ficou pra trás, mostrada antes do pagamento
//   • o envio de várias fotos de uma vez, com nova tentativa automática

import { useEffect, useRef, useState } from "react";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Check, ChevronDown, ChevronUp, Clock, Lightbulb, Save, X, Copy, Mail } from "lucide-react";
import { storage } from "@/lib/firebase";
import { BR, D_FONT } from "@/components/brand";

const P = { ink: BR.wine, sub: BR.mutedInk, pink: BR.pink, soft: BR.blush, line: BR.line, card: "#fff" };

// ───────── etapas: opcionais, tempo e dicas ─────────

// Etapas que a pessoa pode pular sem quebrar nada (a parte só não aparece).
export const OPCIONAIS = new Set(["Visual", "Tema", "Meses", "Músicas", "Números", "Promessas", "Fotos", "Música", "Timeline"]);

// Minutos que cada etapa costuma levar — usado no "≈ X min pra terminar".
const MINUTOS: Record<string, number> = {
  Estilo: 0.3, Visual: 0.5, Tema: 0.5, Casal: 1.5, Nome: 1, Meses: 3, Fotos: 2, Músicas: 1.5, Música: 1,
  Números: 1, Promessas: 1, Mensagem: 1.5, Timeline: 2, Date: 1.5, Finalizar: 1,
};

export function minutosRestantes(steps: readonly string[], atual: number) {
  return steps.slice(atual).reduce((s, n) => s + (MINUTOS[n] ?? 1), 0);
}
export function textoTempo(min: number) {
  if (min < 1) return "menos de 1 min pra terminar";
  return `≈ ${Math.ceil(min)} min pra terminar`;
}

// A etapa está "vazia"? (serve pra marcar como pulada e pra lista do final)
export function etapaVazia(name: string, d: any): boolean {
  switch (name) {
    case "Meses":
      return !(d.retroMonths ?? []).some((m: any) => m.title?.trim() || m.photo);
    case "Músicas":
      return !(d.retroSongs ?? []).some((s: any) => s.title?.trim());
    case "Números":
      return !(d.retroStats ?? []).some((s: any) => s.value?.trim() && s.label?.trim());
    case "Promessas":
      return !(d.retroPromises ?? []).some((p: string) => p.trim());
    case "Fotos":
      return !(d.photos ?? []).length;
    case "Música":
      return !String(d.music ?? "").trim();
    case "Timeline":
      return !(d.moments ?? d.timeline ?? []).length;
    default:
      return false;
  }
}

// O que a pessoa perde se pular — aparece na lista antes de pagar.
const O_QUE_FALTA: Record<string, string> = {
  Meses: "a linha do tempo com os momentos do ano",
  Músicas: "a trilha sonora (e o player com a música de vocês)",
  Números: "os números do casal",
  Promessas: "as promessas pro ano que vem",
  Fotos: "as fotos de vocês",
  Música: "a música de vocês",
  Timeline: "a linha do tempo",
};

type Ajuda = { dica: string; exemplos?: string[] };
export const AJUDA: Record<string, Ajuda> = {
  Estilo: { dica: "Na dúvida, a Retrospectiva é a que mais emociona no fim de ano: ela conta o ano de vocês mês a mês." },
  Visual: {
    dica: "Dá pra trocar depois, a qualquer momento. Veja o preview pra decidir.",
    exemplos: ["Polaroid Kraft: fotos reveladas num caderno, mais romântico", "Colagem Sol: colorido e divertido, combina com qualquer casal", "Coloridos: estilo retrospectiva de app de música, números gigantes"],
  },
  Casal: {
    dica: "O link é o endereço da página (ex.: joao-e-maria). Use letras minúsculas e hífen, sem espaço.",
    exemplos: ["Link: ana-e-pedro-2026 · nosso-ano · meu-amor-luiza", "Foto de capa: uma foto vertical dos dois, bem iluminada", "Data: o dia em que começaram a namorar (ou se conheceram)"],
  },
  Meses: {
    dica: "Não precisa preencher os 12 meses. 4 a 6 momentos já ficam lindos. Dá pra subir várias fotos de uma vez e só escrever as legendas depois.",
    exemplos: ["Jan · Primeira viagem juntos pra praia", "Mar · O jantar que deu tudo errado (e foi perfeito)", "Jun · Nosso aniversário de namoro", "Out · Conheci sua família ♥"],
  },
  Músicas: {
    dica: "A música nº 1 fica num player na página, pronta pra pessoa dar play. Coloque a que mais representa vocês.",
    exemplos: ["A música do primeiro encontro", "A que tocou na primeira viagem", "Aquela que vocês cantam no carro"],
  },
  Números: {
    dica: "É a parte mais divertida: pode ser sério ou zoeira, ninguém vai conferir.",
    exemplos: ["1.247 · vezes que eu disse te amo", "38 · pizzas divididas", "12 · séries que a gente maratonou", "0 · vezes que eu ganhei uma discussão"],
  },
  Promessas: {
    dica: "Coisas simples funcionam melhor do que promessas gigantes.",
    exemplos: ["Viajar pra um lugar novo juntos", "Um date por mês sem celular", "Aprender a cozinhar aquele prato juntos"],
  },
  Mensagem: {
    dica: "Escreva como se estivesse falando com a pessoa. Sem medo de ser simples: 3 ou 4 frases verdadeiras emocionam mais do que um texto enorme.",
    exemplos: ["Comece lembrando um momento do ano", "Diga o que mudou na sua vida com ela", "Termine com um desejo pro ano que vem"],
  },
  Nome: { dica: "O título aparece no topo. A data vira o contador ao vivo de tempo juntos.", exemplos: ["Para o amor da minha vida", "Nossa história", "Pra você, Ana ♥"] },
  Fotos: { dica: "Escolha várias de uma vez na galeria. Fotos verticais ficam melhores no celular." },
  Música: { dica: "Cole o link do Spotify ou do YouTube da música de vocês." },
  Timeline: { dica: "Os marcos da história: onde se conheceram, o primeiro beijo, o pedido de namoro…" },
  Date: { dica: "A resposta chega direto no seu WhatsApp, então confira o número." },
  Finalizar: { dica: "Seus dados servem só pra te mandar o link. O pagamento é feito na Kiwify, com Pix ou cartão." },
};

export function AjudaEtapa({ name }: { name: string }) {
  const a = AJUDA[name];
  const [aberto, setAberto] = useState(false);
  if (!a) return null;
  return (
    <div style={{ marginBottom: 16, borderRadius: 14, background: "#FFF9E6", border: "1px solid #F5E1A4", padding: "9px 12px" }}>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: P.ink, lineHeight: 1.45 }}>
        <Lightbulb size={16} color="#C99400" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ flex: 1 }}>{a.dica}</span>
      </div>
      {a.exemplos && (
        <>
          <button
            onClick={() => setAberto((v) => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, marginLeft: 25, padding: 0, background: "none", border: "none", color: "#9A7300", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            {aberto ? "esconder exemplos" : "ver exemplos"} {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {aberto && (
            <ul style={{ margin: "8px 0 2px 25px", padding: 0, listStyle: "none", display: "grid", gap: 5 }}>
              {a.exemplos.map((e) => (
                <li key={e} style={{ fontSize: 12.5, color: P.sub, lineHeight: 1.4 }}>• {e}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// ───────── barra de etapas ─────────

type ChipProps = {
  steps: readonly string[];
  atual: number;
  liberadoAte: number; // última etapa que dá pra abrir (as obrigatórias pendentes travam o resto)
  vistos: number[];
  d: any;
  emoji: Record<string, string>;
  onGo: (i: number) => void;
};

export function BarraEtapas({ steps, atual, liberadoAte, vistos, d, emoji, onGo }: ChipProps) {
  // mantém a etapa atual visível na barra (no celular ela rola de lado)
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = caixa.current?.querySelector<HTMLElement>('[aria-current="step"]');
    const box = caixa.current;
    if (el && box) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [atual]);
  return (
    <div ref={caixa} className="scr" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 0 4px", margin: "0 -4px", scrollbarWidth: "none" }}>
      {steps.map((n, i) => {
        const ativo = i === atual;
        const visto = vistos.includes(i) && i !== atual;
        const pulado = visto && OPCIONAIS.has(n) && etapaVazia(n, d);
        const travado = i > liberadoAte;
        const bg = ativo ? P.pink : pulado ? "#FFF9E6" : visto ? P.soft : "#fff";
        return (
          <button
            key={n}
            onClick={() => !travado && onGo(i)}
            disabled={travado}
            aria-current={ativo ? "step" : undefined}
            title={travado ? "Preencha as etapas anteriores primeiro" : n}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              cursor: travado ? "not-allowed" : "pointer",
              opacity: travado ? 0.45 : 1,
              background: bg,
              color: ativo ? "#fff" : P.ink,
              border: `1.5px solid ${ativo ? P.pink : pulado ? "#F5E1A4" : visto ? P.pink : P.line}`,
              whiteSpace: "nowrap",
            }}
          >
            {visto && !pulado ? <Check size={12} strokeWidth={3} color={P.pink} /> : <span style={{ fontSize: 11 }}>{emoji[n]}</span>}
            {n}
            {OPCIONAIS.has(n) && !ativo && !visto && <span style={{ fontSize: 9.5, fontWeight: 700, color: P.sub, opacity: 0.8 }}>opcional</span>}
            {pulado && <span style={{ fontSize: 9.5, fontWeight: 700, color: "#9A7300" }}>pulada</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TempoRestante({ min }: { min: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: P.sub }}>
      <Clock size={13} /> {textoTempo(min)}
    </span>
  );
}

// ───────── o que ficou pra trás (antes de pagar) ─────────

export function Pendencias({ steps, d, onGo }: { steps: readonly string[]; d: any; onGo: (i: number) => void }) {
  const faltam = steps.map((n, i) => ({ n, i })).filter(({ n }) => OPCIONAIS.has(n) && O_QUE_FALTA[n] && etapaVazia(n, d));
  if (!faltam.length) return null;
  return (
    <div style={{ marginBottom: 20, padding: "13px 14px", borderRadius: 14, background: "#FFF9E6", border: "1px solid #F5E1A4" }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: P.ink, marginBottom: 4 }}>Você pulou {faltam.length === 1 ? "uma parte" : `${faltam.length} partes`}</div>
      <div style={{ fontSize: 12.5, color: P.sub, lineHeight: 1.45, marginBottom: 10 }}>
        Tudo bem: a página funciona sem elas, essas partes só não aparecem. Se quiser, completa agora em 1 minutinho.
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {faltam.map(({ n, i }) => (
          <button
            key={n}
            onClick={() => onGo(i)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 12px", borderRadius: 10, border: `1px solid ${P.line}`, background: "#fff", cursor: "pointer", textAlign: "left", fontSize: 13, color: P.ink }}
          >
            <span>
              <b>{n}</b> <span style={{ color: P.sub }}>· {O_QUE_FALTA[n]}</span>
            </span>
            <span style={{ color: P.pink, fontWeight: 700, flexShrink: 0 }}>completar →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────── rascunho na nuvem ─────────

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export function idRascunho(): string {
  try {
    const salvo = localStorage.getItem("fmh_draft_id");
    if (salvo && /^[A-Za-z0-9]{24}$/.test(salvo)) return salvo;
    const r = crypto.getRandomValues(new Uint8Array(24));
    const id = Array.from(r, (x) => ALFABETO[x % ALFABETO.length]).join("");
    localStorage.setItem("fmh_draft_id", id);
    return id;
  } catch {
    return "";
  }
}

export async function salvarRascunhoNuvem(d: any, step: number, extra: { email?: string; enviarEmail?: boolean } = {}) {
  const id = idRascunho();
  if (!id) return null;
  try {
    const res = await fetch("/api/rascunho", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, step, d, ...extra }),
      keepalive: !extra.enviarEmail,
    });
    if (!res.ok) return null;
    return { id, ...(await res.json()) } as { id: string; ok: boolean; emailEnviado?: boolean };
  } catch {
    return null;
  }
}

export async function carregarRascunhoNuvem(id: string): Promise<{ d: any; step: number } | null> {
  try {
    const res = await fetch(`/api/rascunho?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function SalvarDepois({ d, step, onClose, onSaved }: { d: any; step: number; onClose: () => void; onSaved: (email: string) => void }) {
  const [email, setEmail] = useState<string>(d.buyerEmail || "");
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "erro">("");
  const [copiado, setCopiado] = useState(false);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const link = typeof window !== "undefined" ? `${window.location.origin}/criar?rascunho=${idRascunho()}` : "";

  const enviar = async () => {
    setEstado("enviando");
    const r = await salvarRascunhoNuvem({ ...d, buyerEmail: d.buyerEmail || email.trim() }, step, { email: email.trim(), enviarEmail: true });
    if (r?.ok) {
      setEstado("ok");
      onSaved(email.trim());
    } else setEstado("erro");
  };
  const copiar = async () => {
    await salvarRascunhoNuvem(d, step);
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {}
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(26,6,39,.55)", display: "grid", placeItems: "end center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: BR.cream, borderRadius: "22px 22px 0 0", padding: "22px 20px calc(22px + env(safe-area-inset-bottom))", boxShadow: "0 -10px 40px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: 22, color: P.ink }}>Continuar depois</span>
          <button onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: P.sub }}>
            <X size={20} />
          </button>
        </div>
        {estado === "ok" ? (
          <p style={{ fontSize: 14.5, color: P.ink, lineHeight: 1.5, margin: "6px 0 14px" }}>
            Prontinho! Mandamos o link pra <b>{email.trim()}</b>. Abra quando quiser, em qualquer aparelho: tudo o que você preencheu, inclusive as fotos, vai estar lá. ♥
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13.5, color: P.sub, lineHeight: 1.5, margin: "0 0 14px" }}>
              Tudo o que você preencheu (inclusive as fotos) fica salvo. A gente te manda um link pra continuar de onde parou, no celular ou no computador.
            </p>
            <input
              className="qinput"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 12, border: `1.5px solid ${P.line}`, fontSize: 16, background: "#fff", color: P.ink, outline: "none" }}
            />
            {estado === "erro" && <div style={{ fontSize: 12.5, color: "#C0392B", marginTop: 8 }}>Não deu pra enviar agora. Tente de novo ou copie o link abaixo.</div>}
            <button
              onClick={enviar}
              disabled={!emailOk || estado === "enviando"}
              style={{ width: "100%", marginTop: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, border: "none", background: P.pink, color: "#fff", fontSize: 15, fontWeight: 700, cursor: emailOk ? "pointer" : "default", opacity: emailOk ? 1 : 0.5, boxShadow: emailOk ? `0 5px 0 ${BR.wine}` : "none" }}
            >
              <Mail size={16} /> {estado === "enviando" ? "Salvando…" : "Me mandar o link por e-mail"}
            </button>
          </>
        )}
        <button
          onClick={copiar}
          style={{ width: "100%", marginTop: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 14, border: `1.5px solid ${P.line}`, background: "#fff", color: P.ink, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          {copiado ? <Check size={16} color="#1F9D72" /> : <Copy size={16} />} {copiado ? "Link copiado!" : "Copiar o link do rascunho"}
        </button>
        <div style={{ fontSize: 11.5, color: P.sub, textAlign: "center", marginTop: 10 }}>Não compartilhe esse link: ele abre o seu rascunho.</div>
      </div>
    </div>
  );
}

export function BotaoSalvar({ onClick, salvoEm }: { onClick: () => void; salvoEm: number | null }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: 0, color: P.sub, fontSize: 12.5, cursor: "pointer" }}>
      <Save size={13} /> {salvoEm ? "salvo ✓ · continuar depois" : "salvar e continuar depois"}
    </button>
  );
}

// ───────── fotos: várias de uma vez, com nova tentativa ─────────

export async function comprimirImagem(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900_000) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.82));
  } catch {
    // HEIC de iPhone antigo ou arquivo estranho: manda o original mesmo
    return file;
  }
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Comprime e envia uma foto. Se a internet do celular oscilar, tenta de novo
// (até 3 vezes) antes de mostrar erro — no 4G isso resolve a maioria das falhas.
export async function uploadTo(slug: string, prefix: string, file: File) {
  const blob = await comprimirImagem(file);
  // Alguns Androids entregam a foto sem tipo (""). As regras do Storage só
  // aceitam "image/*", então sem isso o envio é recusado.
  const contentType = blob.type || file.type || "image/jpeg";
  const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1] || "jpg";
  const r = sRef(storage, `pages/${slug.replace(/-+$/, "")}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`);
  let ultimoErro: unknown;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      await uploadBytes(r, blob, { contentType });
      return await getDownloadURL(r);
    } catch (e) {
      ultimoErro = e;
      const raw = String((e as { code?: string })?.code ?? "");
      // erro de permissão/plano não melhora tentando de novo
      if (/unauthorized|permission|quota|billing/i.test(raw)) break;
      await espera(800 * (tentativa + 1));
    }
  }
  throw ultimoErro;
}

// Envia várias fotos, 3 por vez (rápido sem travar celular fraco), avisando o
// progresso. Devolve as que deram certo na MESMA ordem; as que falharam viram null.
export async function enviarVarias(
  slug: string,
  prefix: (i: number) => string,
  files: File[],
  onProgresso: (feitas: number, total: number) => void
): Promise<{ urls: (string | null)[]; erros: unknown[] }> {
  const urls: (string | null)[] = new Array(files.length).fill(null);
  const erros: unknown[] = [];
  let proxima = 0;
  let feitas = 0;
  onProgresso(0, files.length);
  const worker = async () => {
    while (proxima < files.length) {
      const i = proxima++;
      try {
        urls[i] = await uploadTo(slug, prefix(i), files[i]);
      } catch (e) {
        erros.push(e);
      }
      onProgresso(++feitas, files.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
  return { urls, erros };
}

export function BarraEnvio({ feitas, total }: { feitas: number; total: number }) {
  if (!total) return null;
  const p = Math.round((feitas / total) * 100);
  return (
    <div style={{ margin: "10px 0 4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: P.ink, marginBottom: 5 }}>
        <span>Enviando fotos… {feitas} de {total}</span>
        <span style={{ color: P.pink, fontWeight: 700 }}>{p}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: P.soft, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${p}%`, background: P.pink, transition: "width .3s" }} />
      </div>
      <div style={{ fontSize: 11.5, color: P.sub, marginTop: 5 }}>Pode continuar preenchendo, não feche a página.</div>
    </div>
  );
}

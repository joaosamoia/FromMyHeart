"use client";

// app/criar/page.tsx
// Quiz de personalização — versão completa, com preview AO VIVO no iPhone,
// modo imersivo ("deslize para abrir") e checkout em 3 fases.
//
// Fluxo: preenche → salva rascunho no Firestore (status "pendente") →
// redireciona pro checkout certo da Kiwify (8 combinações de plano × addons)
// → o webhook confirma o pagamento e libera a página.

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Heart, ArrowRight, ArrowLeft, Eye, ChevronDown, ChevronUp, Rocket, Sparkles, X,
  Palette, Check, Calendar, Upload, Image as ImageIcon, Wand2, Search, Music,
  Trash2, Plus, Crown, ShieldCheck, Zap, Star, EyeOff, LayoutTemplate, MessageCircle, Mail, Send,
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { emptyCouplePageDoc, type CoupleMoment } from "@/types/page";
import CouplePageContent, { THEMES, getTheme, MOMENT_ICONS } from "@/components/CouplePageContent";
import DatePage, { DATE_TEMPLATES, type DateTemplateId } from "@/components/DatePage";

// ⚠️ Troque pelos links reais dos seus produtos na Kiwify.
const KIWIFY_CHECKOUT: Record<string, string> = {
  "1dia": "https://pay.kiwify.com.br/CY7GbkU",
  "1dia-astral": "https://pay.kiwify.com.br/a9ZQfh5",
  "1dia-qr": "https://pay.kiwify.com.br/zzKOQJ2",
  "1dia-astral-qr": "https://pay.kiwify.com.br/nnHxMtk",
  eterno: "https://pay.kiwify.com.br/b0clBFL",
  "eterno-astral": "https://pay.kiwify.com.br/K9ItEIY",
  "eterno-qr": "https://pay.kiwify.com.br/ooq0qgi",
  "eterno-astral-qr": "https://pay.kiwify.com.br/Fv11z3Z",
  date: "https://pay.kiwify.com.br/1tedzUy",
};

const PRICES = { "1dia": 24.9, eterno: 39.9, astral: 10, qr: 4.9, date: 19.9 };
const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const P = {
  bg: "#fdf1f6", bgTint: "#fbe8f1", ink: "#2c2333", sub: "#a493ad",
  pink: "#ec4b93", pinkSoft: "#fbe1ec", pinkBorder: "#f26bae",
  card: "#ffffff", cardBorder: "#f2e0e9", gold: "#c08a2d",
};

const STEPS_FULL = ["Estilo", "Tema", "Nome", "Mensagem", "Fotos", "Música", "Timeline", "Finalizar"] as const;
const STEPS_DATE = ["Estilo", "Date", "Finalizar"] as const;
const getSteps = (style: string) => (style === "date" ? STEPS_DATE : STEPS_FULL);
const EMOJI: Record<string, string> = { Estilo: "✦", Tema: "🎨", Nome: "📝", Mensagem: "💌", Fotos: "📷", Música: "🎵", Timeline: "🕰️", Date: "🐧", Finalizar: "✨" };
const CHEER = (p: number) =>
  p >= 100 ? "Tudo pronto! ♥" : p >= 72 ? "Reta final!" : p >= 45 ? "Metade do caminho!" : p >= 22 ? "Está ficando lindo!" : p > 0 ? "Ótimo começo!" : "Vamos começar!";

const DECLARACAO =
  "Desde o dia em que você entrou na minha vida, tudo passou a fazer mais sentido. Você é o meu lugar favorito, a minha paz e a minha aventura preferida. Obrigado por cada sorriso, cada abraço e cada bom dia. Eu escolheria você em todas as vidas. Te amo mais a cada dia. ♥";

const SUGGESTIONS = [
  { cat: "ROMÂNTICAS INTERNACIONAIS", songs: ["Perfect - Ed Sheeran", "All of Me - John Legend", "A Thousand Years - Christina Perri", "Thinking Out Loud - Ed Sheeran"] },
  { cat: "SERTANEJO", songs: ["Meu Abrigo - Melim", "Amor da Sua Cama - Jorge & Mateus", "Evidências - Chitãozinho & Xororó"] },
  { cat: "MPB & NACIONAIS", songs: ["Trem-Bala - Ana Vilela", "Velha Infância - Tribalistas", "Sozinho - Caetano Veloso"] },
];

// useSearchParams exige um limite de Suspense no App Router — por isso o
// componente real fica separado, e o export default só o envolve.
export default function CriarPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: P.bg }} />}>
      <CriarInner />
    </Suspense>
  );
}

function CriarInner() {
  // Quem chega pela landing do Date (/date) vem com ?estilo=date — já entra no
  // fluxo certo, sem passar pela tela de escolha de estilo.
  const veioDaLandingDate = useSearchParams().get("estilo") === "date";

  const [step, setStep] = useState(veioDaLandingDate ? 1 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [immersive, setImmersive] = useState(false);

  const [d, setD] = useState({
    ...emptyCouplePageDoc(),
    slug: "",
    ...(veioDaLandingDate ? { style: "date" as const } : {}),
  });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((s) => ({ ...s, [k]: e.target.value }));

  const STEPS = getSteps(d.style);
  const stepC = Math.min(step, STEPS.length - 1);
  const progress = Math.round((stepC / (STEPS.length - 1)) * 100);
  const last = stepC === STEPS.length - 1;
  const name = STEPS[stepC];

  const canNext = () => {
    if (name === "Nome") return d.title.trim() !== "" && d.slug.trim() !== "" && d.startDate !== "";
    if (name === "Mensagem") return d.message.trim() !== "";
    if (name === "Date") return (d.whatsapp ?? "").replace(/\D/g, "").length >= 10 && d.slug.trim() !== "";
    return true;
  };
  const ok = canNext();

  return (
    <div style={{ minHeight: "100vh", background: P.bg, fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexWrap: "wrap" }}>
      <style>{`
        @keyframes stepIn { from{opacity:0; transform:translateY(10px);} to{opacity:1; transform:none;} }
        @keyframes beatBig {0%,100%{transform:scale(1);}14%{transform:scale(1.18);}28%{transform:scale(1);}42%{transform:scale(1.12);}70%{transform:scale(1);}}
        @keyframes nudge {0%,100%{transform:translateX(0);opacity:.5;}50%{transform:translateX(7px);opacity:1;}}
        @media (prefers-reduced-motion: reduce){ *{animation:none!important;} }
        .qi { animation: stepIn .45s ease both; }
        .qinput:focus { border-color:${P.pinkBorder} !important; box-shadow:0 0 0 3px ${P.pinkSoft}; }
        .drop:hover { border-color:${P.pinkBorder} !important; background:${P.pinkSoft} !important; }
        .scr::-webkit-scrollbar{ width:0; }
        @media (max-width: 900px) { .preview-col { display:none; } }
      `}</style>

      {/* ───────── ESQUERDA: QUIZ ───────── */}
      <div style={{ flex: "1 1 440px", minWidth: 320, display: "flex", flexDirection: "column", background: `linear-gradient(180deg, ${P.bgTint}, ${P.bg})`, minHeight: "100vh" }}>
        <div style={{ padding: "20px 28px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, color: P.ink }}>
              <Rocket size={16} color={P.pink} /> {CHEER(progress)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: P.pink }}>{progress}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: P.pinkSoft, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, borderRadius: 99, background: `linear-gradient(90deg,#f871a8,${P.pink})`, transition: "width .5s ease" }} />
          </div>
        </div>

        <div className="scr" style={{ flex: 1, overflowY: "auto", padding: "32px 28px 20px" }}>
          <div key={stepC} className="qi">
            <StepBody
              name={name}
              d={d}
              set={set}
              setD={setD}
              saving={saving}
              setSaving={setSaving}
              error={error}
              setError={setError}
              onBack={() => setStep((s) => Math.max(0, s - 1))}
            />
          </div>
        </div>

        {!last && (
          <div style={{ borderTop: `1px solid ${P.cardBorder}`, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(6px)", padding: "12px 20px" }}>
            <div style={{ textAlign: "center", fontSize: 12, color: P.sub, marginBottom: 10 }}>
              {EMOJI[name]} {name} · etapa {stepC + 1} de {STEPS.length}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={stepC === 0}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: stepC === 0 ? "#cbbcd0" : P.sub, fontSize: 14, cursor: stepC === 0 ? "default" : "pointer" }}
              >
                {stepC === 0 ? <X size={16} /> : <ArrowLeft size={16} />} {stepC === 0 ? "Cancelar" : "Voltar"}
              </button>
              <button
                onClick={() => ok && setStep(stepC + 1)}
                disabled={!ok}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 26px", borderRadius: 99, border: "none", cursor: ok ? "pointer" : "default", fontSize: 14, fontWeight: 600, color: "#fff", opacity: ok ? 1 : 0.55, background: "linear-gradient(135deg,#f871a8,#ec4b93)", boxShadow: ok ? "0 6px 16px rgba(236,75,147,0.28)" : "none" }}
              >
                Continuar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ───────── DIREITA: PREVIEW AO VIVO ───────── */}
      <div className="preview-col" style={{ flex: "1 1 400px", minWidth: 360, display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 20px 40px" }}>
        <p style={{ textAlign: "center", color: P.sub, fontSize: 13, maxWidth: 280, margin: "6px 0 12px" }}>
          Você pode ver o resultado ao lado enquanto personaliza
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: P.pink, fontSize: 13, fontWeight: 500 }}>
          <Eye size={15} /> Veja como está ficando 👇
        </div>
        <ChevronDown size={18} color={P.pinkBorder} style={{ margin: "4px 0 14px" }} />

        <div style={{ width: 280, borderRadius: 44, padding: 10, background: "#1b1b1f", boxShadow: "0 24px 50px -18px rgba(120,40,90,0.45)" }}>
          <div style={{ position: "relative", borderRadius: 34, overflow: "hidden", height: 540 }}>
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 74, height: 20, background: "#0f0f12", borderRadius: 99, zIndex: 3 }} />
            <div className="scr" style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
              {d.style === "date" ? <DatePage whatsapp={d.whatsapp} nickname={d.nickname} template={d.dateTemplate} /> : <CouplePageContent page={d} compact />}
            </div>
          </div>
        </div>

        <button
          onClick={() => setImmersive(true)}
          style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 99, border: `1.5px solid ${P.pinkBorder}`, background: "#fff", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: P.pink }}
        >
          <Sparkles size={15} /> Ver em tela cheia
        </button>
      </div>

      {immersive && <ImmersivePreview d={d} onClose={() => setImmersive(false)} />}
    </div>
  );
}

// ───────────────── etapas ─────────────────
function StepBody({ name, d, set, setD, saving, setSaving, error, setError, onBack }: any) {
  if (name === "Estilo")
    return (
      <>
        <Head title="Escolha o estilo do presente" sub="Como você quer surpreender quem você ama?" />
        <div style={{ display: "grid", gap: 12 }}>
          {[
            { id: "classica", Icon: Heart, name: "Clássica", desc: "Contador, fotos, timeline e mensagem", price: "a partir de R$ 24,90" },
            { id: "date", Icon: LayoutTemplate, name: "Date", desc: "Convite interativo: \"Aceita um date?\" 🐧💙", price: "R$ 19,90" },
          ].map((s) => {
            const active = d.style === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setD((x: any) => ({ ...x, style: s.id }))}
                style={{ position: "relative", textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, cursor: "pointer", background: active ? P.pinkSoft : P.card, border: `1.5px solid ${active ? P.pinkBorder : P.cardBorder}`, transition: "all .2s" }}
              >
                <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: active ? "#fff" : P.pinkSoft, display: "grid", placeItems: "center" }}>
                  <s.Icon size={20} color={P.pink} />
                </span>
                <span style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: P.ink }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: P.sub, marginTop: 1 }}>{s.desc}</div>
                  <div style={{ fontSize: 12, color: P.pink, fontWeight: 600, marginTop: 4 }}>{s.price}</div>
                </span>
                {active && <Check size={18} color={P.pink} />}
              </button>
            );
          })}
        </div>
      </>
    );

  if (name === "Tema")
    return (
      <>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: P.pinkSoft, display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Palette size={26} color={P.pink} />
          </div>
          <h2 style={h2}>Escolha o tema da página</h2>
          <p style={subTxt}>As cores que combinam com vocês</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {Object.entries(THEMES).map(([id, t]) => {
            const active = d.theme === id;
            return (
              <button
                key={id}
                onClick={() => setD((s: any) => ({ ...s, theme: id }))}
                style={{ position: "relative", height: 96, borderRadius: 16, padding: 10, cursor: "pointer", background: t.swatch, border: `2px solid ${active ? P.pinkBorder : "transparent"}`, boxShadow: active ? `0 0 0 3px ${P.pinkSoft}` : "0 2px 8px rgba(120,40,90,0.12)", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", transition: "all .18s" }}
              >
                {active && (
                  <span style={{ position: "absolute", top: 7, right: 7, width: 20, height: 20, borderRadius: "50%", background: P.pink, display: "grid", placeItems: "center" }}>
                    <Check size={13} color="#fff" strokeWidth={3} />
                  </span>
                )}
                <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
                  <Heart size={22} color={t.dark ? "rgba(255,255,255,0.9)" : "#f07bad"} fill={t.dark ? "rgba(255,255,255,0.9)" : "#f7c6dc"} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 4 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1.15, textAlign: "left", color: t.dark ? "#fff" : "#5a4a52" }}>{t.name}</span>
                  {t.vip && <span style={{ flexShrink: 0, fontSize: 8, fontWeight: 800, color: "#fff", background: "#ef9f2e", padding: "2px 6px", borderRadius: 99 }}>VIP</span>}
                </div>
              </button>
            );
          })}
        </div>
      </>
    );

  if (name === "Nome")
    return (
      <>
        <Head title="Vamos criar seu presente!" sub="Link, título e a data que marca o início de tudo." />
        <label style={lbl}>
          <span style={lblTxt}>Link da sua página</span>
          <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${P.cardBorder}`, borderRadius: 12, background: P.card }}>
            <span style={{ padding: "12px 4px 12px 14px", color: P.sub, fontSize: 14 }}>seusite.com/</span>
            <input
              className="qinput"
              value={d.slug}
              onChange={(e) => setD((s: any) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
              placeholder="joao-e-maria"
              style={{ flex: 1, border: "none", outline: "none", padding: "12px 14px 12px 0", fontSize: 14, background: "transparent" }}
            />
          </div>
        </label>
        <label style={lbl}>
          <span style={lblTxt}>Título da página</span>
          <input className="qinput" value={d.title} onChange={set("title")} placeholder="Ex: Para o amor da minha vida" style={inp} />
        </label>
        <label style={lbl}>
          <span style={lblTxt}>Quando essa história começou?</span>
          <input className="qinput" type="date" value={d.startDate} onChange={set("startDate")} style={{ ...inp, textAlign: "center", colorScheme: "light", cursor: "pointer" }} />
        </label>
        <Hint>O título aparece no topo da página, e a data alimenta o contador ao vivo.</Hint>
      </>
    );

  if (name === "Mensagem")
    return (
      <>
        <Head title="Escreva sua declaração de amor" sub="As palavras que vão emocionar quem você ama." />
        <button
          onClick={() => setD((s: any) => ({ ...s, message: DECLARACAO }))}
          style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, border: "none", cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg,#f45fa8,#a03fd0)", boxShadow: "0 6px 16px rgba(160,63,208,0.28)", marginBottom: 14 }}
        >
          <Wand2 size={17} /> Gerar declaração automática
        </button>
        <div style={{ textAlign: "center", fontSize: 12, color: P.sub, marginBottom: 12 }}>ou escreva manualmente</div>
        <textarea className="qinput" rows={6} value={d.message} onChange={set("message")} placeholder="Escreva aqui tudo o que você sente..." style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
        <div style={{ textAlign: "right", fontSize: 12, color: P.sub, marginTop: 6 }}>{d.message.length} caracteres</div>
      </>
    );

  if (name === "Fotos") return <FotosStep d={d} setD={setD} />;
  if (name === "Música") return <MusicStep d={d} setD={setD} />;
  if (name === "Timeline") return <TimelineStep d={d} setD={setD} />;

  if (name === "Date") {
    const phoneMask = (v: string) => {
      const n = v.replace(/\D/g, "").slice(0, 11);
      if (n.length <= 2) return n.length ? `(${n}` : "";
      if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
      if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
      return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    };
    return (
      <>
        <Head title="Configure seu convite" sub="Só o essencial pra enviar seu 'aceita um date?'" />

        <span style={lblTxt}>Escolha o visual do convite</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {(Object.keys(DATE_TEMPLATES) as (keyof typeof DATE_TEMPLATES)[]).map((id) => {
            const t = DATE_TEMPLATES[id];
            const active = (d.dateTemplate ?? "sunset") === id;
            return (
              <button
                key={id}
                onClick={() => setD((s: any) => ({ ...s, dateTemplate: id }))}
                style={{
                  position: "relative",
                  padding: "16px 12px",
                  borderRadius: 16,
                  cursor: "pointer",
                  textAlign: "center",
                  background: t.bg,
                  color: t.text,
                  border: `2px solid ${active ? P.pinkBorder : "transparent"}`,
                  boxShadow: active ? `0 0 0 3px ${P.pinkSoft}` : "0 2px 8px rgba(120,40,90,0.12)",
                  transition: "all .18s",
                }}
              >
                {active && (
                  <span style={{ position: "absolute", top: 7, right: 7, width: 20, height: 20, borderRadius: "50%", background: P.pink, display: "grid", placeItems: "center" }}>
                    <Check size={13} color="#fff" strokeWidth={3} />
                  </span>
                )}
                <div style={{ fontSize: 30, lineHeight: 1 }}>{t.emojiFinal}</div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 8 }}>{t.nome}</div>
                <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 2, lineHeight: 1.3 }}>{t.descricao}</div>
              </button>
            );
          })}
        </div>

        <label style={lbl}>
          <span style={lblTxt}>Seu WhatsApp (onde chega a resposta)</span>
          <input
            className="qinput"
            value={d.whatsapp ?? ""}
            onChange={(e) => setD((s: any) => ({ ...s, whatsapp: phoneMask(e.target.value) }))}
            placeholder="(41) 99999-9999"
            style={inp}
          />
        </label>
        <label style={lbl}>
          <span style={lblTxt}>Apelido carinhoso (opcional)</span>
          <input className="qinput" value={d.nickname ?? ""} onChange={set("nickname")} placeholder="Ex: gata, amor, princesa" style={inp} />
        </label>
        <label style={lbl}>
          <span style={lblTxt}>Link da página</span>
          <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${P.cardBorder}`, borderRadius: 12, background: P.card }}>
            <span style={{ padding: "12px 4px 12px 14px", color: P.sub, fontSize: 14 }}>seusite.com/</span>
            <input
              className="qinput"
              value={d.slug}
              onChange={(e) => setD((s: any) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
              placeholder="aceita-um-date"
              style={{ flex: 1, border: "none", outline: "none", padding: "12px 14px 12px 0", fontSize: 14, background: "transparent" }}
            />
          </div>
        </label>
        <Hint>A pessoa recebe o convite, aceita, escolhe data/comida/vibe — e a resposta cai direto no seu WhatsApp. 💌</Hint>
      </>
    );
  }

  return <FinalStep d={d} setD={setD} saving={saving} setSaving={setSaving} error={error} setError={setError} onBack={onBack} />;
}

function FotosStep({ d, setD }: any) {
  const onFiles = async (files: FileList | null) => {
    if (!files || !d.slug) return;
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 10 - d.photos.length)) {
      const path = `pages/${d.slug}/${Date.now()}-${file.name}`;
      const r = sRef(storage, path);
      await uploadBytes(r, file);
      uploaded.push(await getDownloadURL(r));
    }
    setD((s: any) => ({ ...s, photos: [...s.photos, ...uploaded].slice(0, 10) }));
  };
  return (
    <>
      <Head title="Adicione fotos especiais" sub="Os momentos mais marcantes do seu amor." />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: P.ink }}>
          <ImageIcon size={17} color={P.pink} /> Fotos
        </span>
        <span style={{ fontSize: 13, color: P.sub }}>{d.photos.length}/10</span>
      </div>
      {!d.slug && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 10 }}>Volte e defina o link da página antes de subir fotos.</p>}
      {d.photos.length < 10 && (
        <label className="drop" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "30px 16px", borderRadius: 16, border: `2px dashed ${P.pinkBorder}`, background: "rgba(255,255,255,0.4)", cursor: d.slug ? "pointer" : "not-allowed", opacity: d.slug ? 1 : 0.5, transition: "all .2s" }}>
          <input type="file" accept="image/*" multiple disabled={!d.slug} onChange={(e) => onFiles(e.target.files)} style={{ display: "none" }} />
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: P.pinkSoft, display: "grid", placeItems: "center" }}>
            <Upload size={20} color={P.pink} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: P.ink }}>Adicionar fotos</div>
          <div style={{ fontSize: 12.5, color: P.sub }}>Até 10 fotos (opcional)</div>
        </label>
      )}
      {d.photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 14 }}>
          {d.photos.map((p: string, i: number) => (
            <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `1px solid ${P.cardBorder}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={() => setD((s: any) => ({ ...s, photos: s.photos.filter((_: any, j: number) => j !== i) }))}
                style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", color: "#fff", cursor: "pointer", fontSize: 11, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function MusicStep({ d, setD }: any) {
  const [query, setQuery] = useState("");
  const [showSug, setShowSug] = useState(true);
  const link = d.music && /^https?:/i.test(d.music) ? d.music : "";
  const linkType = /youtu\.?be/i.test(link) ? "YouTube" : /spotify/i.test(link) ? "Spotify" : "";
  const q = query.trim().toLowerCase();
  const setMusic = (v: string) => setD((s: any) => ({ ...s, music: v }));

  return (
    <>
      <Head title="A música de vocês" sub="Busque a trilha sonora do casal." />
      <div style={{ display: "grid", placeItems: "center", marginBottom: 18 }}>
        <Music size={30} color={P.pink} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${P.cardBorder}`, borderRadius: 12, background: "#fff", padding: "0 12px", marginBottom: 18 }}>
        <Search size={16} color={P.sub} />
        <input className="qinput" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar música..." style={{ flex: 1, border: "none", outline: "none", padding: "12px 0", fontSize: 14, background: "transparent" }} />
      </div>

      <div style={{ textAlign: "center", fontSize: 12, color: P.sub, margin: "0 0 12px" }}>ou cole um link</div>
      <input
        className="qinput"
        value={link}
        onChange={(e) => setMusic(e.target.value)}
        placeholder="https://open.spotify.com/track/…"
        style={{ ...inp, borderColor: linkType ? "#3fae8f" : P.cardBorder, boxShadow: linkType ? "0 0 0 3px rgba(63,174,143,0.14)" : "none" }}
      />
      {linkType && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#2f8f78", marginTop: 8 }}>
          <Check size={14} /> Música do {linkType} adicionada!
        </div>
      )}

      <button onClick={() => setShowSug((s) => !s)} style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18, padding: 11, borderRadius: 12, border: `1px solid ${P.cardBorder}`, background: "#fff", cursor: "pointer", fontSize: 13.5, fontWeight: 500, color: P.ink }}>
        <Sparkles size={15} color={P.gold} /> {showSug ? "Ocultar sugestões" : "Ver sugestões"} {showSug ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {showSug && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.5)", border: `1px solid ${P.cardBorder}` }}>
          {SUGGESTIONS.map((group) => {
            const songs = q ? group.songs.filter((s) => s.toLowerCase().includes(q)) : group.songs;
            if (!songs.length) return null;
            return (
              <div key={group.cat} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", color: P.sub, marginBottom: 8 }}>{group.cat}</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {songs.map((song) => {
                    const active = d.music === song;
                    return (
                      <button
                        key={song}
                        onClick={() => setMusic(song)}
                        style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "left", padding: "10px 14px", borderRadius: 99, cursor: "pointer", fontSize: 13.5, fontWeight: active ? 600 : 400, border: "none", color: active ? "#fff" : P.ink, background: active ? "linear-gradient(135deg,#f871a8,#ec4b93)" : "transparent" }}
                      >
                        <Music size={14} color={active ? "#fff" : P.pink} /> {song}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function TimelineStep({ d, setD }: any) {
  const moments: CoupleMoment[] = d.moments ?? [];
  const add = () => setD((s: any) => ({ ...s, moments: [...s.moments, { date: "", icon: "amor", title: "", desc: "" }] }));
  const remove = (i: number) => setD((s: any) => ({ ...s, moments: s.moments.filter((_: any, j: number) => j !== i) }));
  const update = (i: number, patch: Partial<CoupleMoment>) =>
    setD((s: any) => ({ ...s, moments: s.moments.map((m: CoupleMoment, j: number) => (j === i ? { ...m, ...patch } : m)) }));

  const setPhoto = async (i: number, file?: File) => {
    if (!file || !d.slug) return;
    const r = sRef(storage, `pages/${d.slug}/moment-${Date.now()}-${file.name}`);
    await uploadBytes(r, file);
    update(i, { photo: await getDownloadURL(r) });
  };

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <h2 style={h2}>Linha do Tempo</h2>
        <p style={subTxt}>Conte os momentos especiais da história de vocês.</p>
        <div style={{ width: 58, height: 58, borderRadius: "50%", background: P.pinkSoft, display: "grid", placeItems: "center", margin: "16px auto 10px" }}>
          <Calendar size={24} color={P.pink} />
        </div>
        <p style={{ fontSize: 13, color: P.sub, margin: 0 }}>Adicione momentos especiais (opcional)</p>
      </div>

      {moments.map((m, i) => (
        <div key={i} style={{ marginTop: 16, padding: 16, borderRadius: 16, background: "#fff", border: `1px solid ${P.cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: P.pink }}>Momento {i + 1}</span>
            <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: P.sub }}>
              <Trash2 size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
            <label style={{ flex: 1 }}>
              <span style={lblTxt}>Data</span>
              <input type="date" className="qinput" value={m.date} onChange={(e) => update(i, { date: e.target.value })} style={{ ...inp, padding: "10px", colorScheme: "light" }} />
            </label>
            <label style={{ flex: 1 }}>
              <span style={lblTxt}>Ícone</span>
              <select className="qinput" value={m.icon} onChange={(e) => update(i, { icon: e.target.value })} style={{ ...inp, padding: "10px", cursor: "pointer" }}>
                {MOMENT_ICONS.map((ic) => (
                  <option key={ic.id} value={ic.id}>{ic.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label style={lbl}>
            <span style={lblTxt}>Título</span>
            <input className="qinput" value={m.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Ex: primeira viagem" style={inp} />
          </label>
          <label style={lbl}>
            <span style={lblTxt}>Descrição (opcional)</span>
            <textarea className="qinput" rows={2} value={m.desc ?? ""} onChange={(e) => update(i, { desc: e.target.value })} placeholder="Conte o que aconteceu…" style={{ ...inp, resize: "vertical" }} />
          </label>
          {m.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.photo} alt="" style={{ width: 90, height: 90, borderRadius: 10, objectFit: "cover", border: `1px solid ${P.cardBorder}` }} />
          ) : (
            <label className="drop" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: `1.5px dashed ${P.pinkBorder}`, cursor: "pointer", fontSize: 13, color: P.pink }}>
              <input type="file" accept="image/*" onChange={(e) => setPhoto(i, e.target.files?.[0])} style={{ display: "none" }} />
              <Upload size={15} /> Adicionar foto
            </label>
          )}
        </div>
      ))}

      <button onClick={add} style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, padding: 13, borderRadius: 12, border: `1.5px dashed ${P.pinkBorder}`, background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 500, color: P.ink }}>
        <Plus size={16} color={P.pink} /> Adicionar momento
      </button>
    </>
  );
}

const PLANS = [
  { id: "1dia" as const, name: "1 Dia", tag: "24 horas de amor", from: "R$ 49,90", price: "R$ 24,90", save: "R$ 25", crown: false, best: false, feats: ["10 fotos dos melhores momentos", "Contador de tempo juntos", "Sua declaração de amor", "Link exclusivo para compartilhar"] },
  { id: "eterno" as const, name: "Plano Eterno", tag: "Para sempre, como o seu amor", from: "R$ 79,90", price: "R$ 39,90", save: "R$ 40", crown: true, best: true, feats: ["Fotos ilimitadas", "Tudo do plano 1 Dia", "Livro de visitas para amigos", "Nunca expira"] },
];

function FinalStep({ d, setD, saving, setSaving, error, setError, onBack }: any) {
  const [phase, setPhase] = useState(0); // 0 conta · 1 planos
  const [showPass, setShowPass] = useState(false);
  const [plan, setPlan] = useState<"1dia" | "eterno">("eterno");
  const [astral, setAstral] = useState(false);
  const [qrOn, setQrOn] = useState(false);
  const [qrStyle, setQrStyle] = useState<"romantico" | "juntos">("romantico");

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.buyerEmail);
  const phoneOk = d.buyerPhone.replace(/\D/g, "").length >= 10;
  const contaOk = d.buyerName.trim() !== "" && emailOk && phoneOk;
  const total = PRICES[plan] + (astral ? PRICES.astral : 0) + (qrOn ? PRICES.qr : 0);

  const phoneMask = (v: string) => {
    const n = v.replace(/\D/g, "").slice(0, 11);
    if (n.length <= 2) return n.length ? `(${n}` : "";
    if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  };

  const onQrPhoto = async (file?: File) => {
    if (!file || !d.slug) return;
    const r = sRef(storage, `pages/${d.slug}/qr-${Date.now()}-${file.name}`);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    setD((s: any) => ({ ...s, qrPhoto: url }));
  };

  const finish = async () => {
    setError("");
    setSaving(true);
    try {
      if (d.style === "date") {
        await setDoc(doc(db, "pages", d.slug), {
          ...d,
          plan: "date",
          astral: false,
          qrStyle: "simples",
          qrPaid: false,
          status: "pendente",
          createdAt: Date.now(),
          paidAt: null,
        });
        window.location.href = `${KIWIFY_CHECKOUT["date"]}?s=${encodeURIComponent(d.slug)}`;
        return;
      }
      await setDoc(doc(db, "pages", d.slug), {
        ...d,
        plan,
        astral,
        qrStyle: qrOn ? qrStyle : "simples",
        qrPaid: false, // só o webhook confirma
        status: "pendente",
        createdAt: Date.now(),
        paidAt: null,
      });
      const key = [plan, astral && "astral", qrOn && "qr"].filter(Boolean).join("-");
      window.location.href = `${KIWIFY_CHECKOUT[key]}?s=${encodeURIComponent(d.slug)}`;
    } catch (err) {
      console.error(err);
      setError("Não foi possível salvar. Tente novamente.");
      setSaving(false);
    }
  };

  const bigBtn = (label: string, onClick: () => void, disabled?: boolean) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18, padding: 15, borderRadius: 14, border: "none", cursor: disabled ? "default" : "pointer", fontSize: 15, fontWeight: 600, color: "#fff", opacity: disabled ? 0.5 : 1, background: "linear-gradient(135deg,#f871a8,#ec4b93)", boxShadow: disabled ? "none" : "0 8px 20px rgba(236,75,147,0.32)" }}
    >
      {label} <ArrowRight size={17} />
    </button>
  );

  // FASE 0 — conta
  if (phase === 0)
    return (
      <>
        <Head title="Último passo!" sub="Seus dados para receber o presente." />
        <div style={{ width: 58, height: 58, borderRadius: "50%", background: P.pinkSoft, display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
          <Heart size={26} color={P.pink} fill={P.pink} />
        </div>
        <input className="qinput" value={d.buyerName} onChange={(e) => setD((s: any) => ({ ...s, buyerName: e.target.value }))} placeholder="Seu nome" style={{ ...inp, marginBottom: 14 }} />
        <input className="qinput" type="email" value={d.buyerEmail} onChange={(e) => setD((s: any) => ({ ...s, buyerEmail: e.target.value }))} placeholder="seu@email.com" style={{ ...inp, borderColor: emailOk ? "#3fae8f" : P.cardBorder }} />
        {emailOk && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#2f8f78", margin: "6px 0 8px" }}><Check size={13} /> Email válido!</div>}
        <input className="qinput" value={d.buyerPhone} onChange={(e) => setD((s: any) => ({ ...s, buyerPhone: phoneMask(e.target.value) }))} placeholder="(41) 99999-9999" style={{ ...inp, marginTop: 8 }} />
        {bigBtn("Continuar", () => setPhase(1), !contaOk)}
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: P.sub, fontSize: 14, cursor: "pointer", marginTop: 12 }}>
          <ArrowLeft size={15} /> Voltar
        </button>
      </>
    );

  // FASE 1 — planos + addons (ou confirmação simples, se for o estilo Date)
  if (d.style === "date") {
    // A confirmação usa o sotaque do template que a pessoa escolheu (laranja ou
    // roxo) — assim a tela de pagamento parece a continuação do produto que ela
    // acabou de montar, e não uma tela genérica.
    const TD = DATE_TEMPLATES[(d.dateTemplate as DateTemplateId) ?? "sunset"] ?? DATE_TEMPLATES.sunset;
    const entrega = [
      { Icon: Zap, t: "Liberação na hora", d: "Assim que o pagamento cair, seu convite fica no ar." },
      { Icon: Mail, t: "Link no seu e-mail", d: "Você recebe o link pronto pra copiar e guardar." },
      { Icon: Send, t: "É só mandar", d: "Cole no WhatsApp ou Instagram e espere a resposta." },
    ];

    return (
      <>
        <div style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/date/penguin-flower.png"
            alt=""
            width={120}
            height={120}
            style={{ objectFit: "contain", display: "block", margin: "0 auto" }}
          />
          <h2 style={{ ...h2, textAlign: "center", marginTop: 6 }}>Seu convite está pronto!</h2>
          <p style={{ ...subTxt, textAlign: "center" }}>Falta só liberar pra mandar pra pessoa.</p>
        </div>

        {/* como recebe */}
        <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
          {entrega.map((e) => (
            <div key={e.t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: TD.accentSoft,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <e.Icon size={16} color={TD.accent} />
              </span>
              <span>
                <div style={{ fontSize: 14, fontWeight: 700, color: P.ink }}>{e.t}</div>
                <div style={{ fontSize: 12.5, color: P.sub, lineHeight: 1.45, marginTop: 1 }}>{e.d}</div>
              </span>
            </div>
          ))}
        </div>

        {/* preço */}
        <div
          style={{
            marginTop: 24,
            padding: "22px 20px 20px",
            borderRadius: 20,
            textAlign: "center",
            background: TD.bg,
            border: `1px solid ${TD.cardBorder}`,
            boxShadow: `0 14px 32px -16px ${TD.accent}`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.6, color: TD.muted }}>PAGAMENTO ÚNICO</div>
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 46,
              fontWeight: 700,
              color: TD.text,
              lineHeight: 1.05,
              margin: "2px 0 4px",
              textShadow: "0 2px 0 rgba(0,0,0,.18)",
            }}
          >
            {fmtBRL(PRICES.date)}
          </div>
          <div style={{ fontSize: 12.5, color: TD.muted }}>sem mensalidade · o link é seu</div>

          <div style={{ height: 1, background: TD.cardBorder, margin: "16px 0 14px" }} />

          <div style={{ display: "grid", gap: 8, textAlign: "left" }}>
            {["Convite interativo completo", "Resposta direto no seu WhatsApp", "Funciona em qualquer celular"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: TD.text }}>
                <Check size={14} color={TD.accent} strokeWidth={3} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 14, fontSize: 11.5, color: P.sub }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <ShieldCheck size={14} color="#2f8f78" /> Pagamento seguro
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Zap size={14} color="#e0a53a" /> Liberação instantânea
          </span>
        </div>

        {error && <p style={{ color: "#c0392b", fontSize: 13, textAlign: "center", marginTop: 10 }}>{error}</p>}
        {bigBtn(saving ? "Salvando..." : "Quero meu convite", finish, saving)}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => setPhase(0)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: P.sub, fontSize: 14, cursor: "pointer", marginTop: 14 }}
          >
            <ArrowLeft size={15} /> Voltar
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 style={{ ...h2, textAlign: "center" }}>
        Você está a um passo de fazer <span style={{ color: P.pink }}>{d.title || "quem você ama"}</span> chorar de emoção
      </h2>
      <div style={{ textAlign: "center", fontSize: 13, color: P.ink, margin: "12px 0 20px", display: "flex", justifyContent: "center", gap: 6 }}>
        <Star size={14} color={P.pink} fill={P.pink} /> Mais de <b style={{ color: P.pink }}>2.847 casais</b> já emocionaram quem amam
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {PLANS.map((pl) => {
          const active = plan === pl.id;
          return (
            <button
              key={pl.id}
              onClick={() => setPlan(pl.id)}
              style={{ position: "relative", textAlign: "left", padding: "20px 18px 18px", borderRadius: 20, cursor: "pointer", transition: "all .2s", transform: active ? "translateY(-2px)" : "none", background: pl.best ? "linear-gradient(180deg,#fff,#fef1f7)" : "#fff", border: `2px solid ${active ? P.pinkBorder : pl.best ? "#f7c9de" : P.cardBorder}`, boxShadow: pl.best ? "0 16px 36px -14px rgba(236,75,147,0.45)" : active ? `0 0 0 3px ${P.pinkSoft}` : "0 2px 10px rgba(120,40,90,0.06)" }}
            >
              {pl.best && (
                <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#f871a8,#c44fd0)", padding: "5px 16px", borderRadius: 99, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(196,79,208,0.4)" }}>
                  💕 MAIS ESCOLHIDO
                </span>
              )}
              <span style={{ position: "absolute", top: 18, right: 16, width: 24, height: 24, borderRadius: "50%", border: `2px solid ${active ? P.pink : "#d9c8d6"}`, background: active ? P.pink : "transparent", display: "grid", placeItems: "center" }}>
                {active && <Check size={14} color="#fff" strokeWidth={3} />}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: pl.best ? 10 : 0 }}>
                {pl.crown ? (
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#f2c76a,#e0a53a)", display: "grid", placeItems: "center", boxShadow: "0 4px 10px rgba(224,165,58,0.4)" }}>
                    <Crown size={18} color="#fff" fill="#fff" />
                  </span>
                ) : (
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: P.pinkSoft, display: "grid", placeItems: "center" }}>
                    <Heart size={17} color={P.pink} fill={P.pink} />
                  </span>
                )}
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: P.ink, lineHeight: 1.1 }}>{pl.name}</div>
                  <div style={{ fontSize: 12, color: P.sub }}>{pl.tag}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: "#c9a2b4", textDecoration: "line-through" }}>{pl.from}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#2f8f78", background: "#d8f2e8", padding: "2px 7px", borderRadius: 6 }}>-50%</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: P.pink, background: P.pinkSoft, padding: "2px 8px", borderRadius: 99 }}>Economize {pl.save}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: P.sub }}>por</span>
                <span style={{ fontSize: 34, fontWeight: 700, color: P.ink, fontFamily: "'Playfair Display', Georgia, serif" }}>{pl.price}</span>
              </div>

              <div style={{ height: 1, background: pl.best ? "#f6d8e6" : P.cardBorder, margin: "14px 0" }} />
              <div style={{ display: "grid", gap: 9 }}>
                {pl.feats.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: P.ink }}>
                    <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", background: P.pinkSoft, display: "grid", placeItems: "center" }}>
                      <Check size={11} color={P.pink} strokeWidth={3} />
                    </span>
                    {f}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* ADDONS */}
      <ToggleCard active={astral} onClick={() => setAstral((a) => !a)} icon="✨" title="Mapa Estelar (+R$ 10,00)" desc="Uma constelação única gerada a partir da sua data." />
      <ToggleCard active={qrOn} onClick={() => setQrOn((q) => !q)} icon="📱" title="QR Code Personalizado (+R$ 4,90)" desc="Perfeito pra imprimir num cartão e dar de presente." mb={qrOn ? 10 : 16} />

      {qrOn && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {(["romantico", "juntos"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setQrStyle(s)}
                style={{ flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 600, border: qrStyle === s ? `2px solid ${P.pinkBorder}` : `1px solid ${P.cardBorder}`, background: qrStyle === s ? P.pinkSoft : "#fff", color: P.ink }}
              >
                {s === "romantico" ? "Romântico" : "Juntos para Sempre"}
              </button>
            ))}
          </div>
          <label className="drop" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, border: `1.5px dashed ${P.pinkBorder}`, fontSize: 12.5, color: P.pink, cursor: "pointer" }}>
            <input type="file" accept="image/*" onChange={(e) => onQrPhoto(e.target.files?.[0])} style={{ display: "none" }} />
            <Upload size={14} /> {d.qrPhoto ? "Trocar foto do QR" : "Adicionar foto pro centro do QR"}
          </label>
        </div>
      )}

      <div style={{ padding: "14px 16px", borderRadius: 12, background: P.pinkSoft, border: `1px solid ${P.cardBorder}`, fontSize: 15, marginBottom: 8 }}>
        Total: <b style={{ color: P.pink }}>{fmtBRL(total)}</b>
      </div>

      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 16, margin: "14px 0", fontSize: 11.5, color: P.sub }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ShieldCheck size={14} color="#2f8f78" /> Pagamento 100% seguro</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Zap size={14} color="#e0a53a" /> Liberação instantânea</span>
      </div>

      {error && <p style={{ color: "#c0392b", fontSize: 13, textAlign: "center" }}>{error}</p>}
      {bigBtn(saving ? "Salvando..." : "Ir para o pagamento", finish, saving)}
      <button onClick={() => setPhase(0)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: P.sub, fontSize: 14, cursor: "pointer", marginTop: 12 }}>
        <ArrowLeft size={15} /> Voltar
      </button>
    </>
  );
}

// ───────── modo imersivo (deslize para abrir) ─────────
function SlideToOpen({ th, onOpen }: any) {
  const [x, setX] = useState(0);
  const drag = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const W = 280, K = 54, MAX = W - K - 8;

  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    setX(Math.max(0, Math.min(MAX, e.clientX - r.left - K / 2)));
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = false;
    if (x > MAX * 0.6) {
      setX(MAX);
      setTimeout(onOpen, 160);
    } else setX(0);
  };

  return (
    <div ref={trackRef} style={{ position: "relative", width: W, maxWidth: "78vw", height: 62, borderRadius: 99, background: th.dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.05)", border: `1px solid ${th.dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)"}`, overflow: "hidden", userSelect: "none", touchAction: "none" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: th.sub, fontSize: 14, opacity: 1 - (x / MAX) * 1.5, pointerEvents: "none" }}>
        deslize para abrir <span style={{ animation: "nudge 1.2s ease-in-out infinite" }}>♥</span>
      </div>
      <div
        onPointerDown={(e) => {
          drag.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ position: "absolute", top: 4, left: 4, transform: `translateX(${x}px)`, width: K, height: K, borderRadius: "50%", background: th.accent, display: "grid", placeItems: "center", cursor: "grab", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", transition: drag.current ? "none" : "transform .3s ease", touchAction: "none" }}
      >
        <Heart size={22} color={th.dark ? "#1b1b1f" : "#fff"} fill={th.dark ? "#1b1b1f" : "#fff"} />
      </div>
    </div>
  );
}

function ImmersivePreview({ d, onClose }: any) {
  const th = getTheme(d.theme);
  const [opened, setOpened] = useState(false);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: th.screen, overflow: "hidden" }}>
      <button onClick={onClose} aria-label="Fechar" style={{ position: "fixed", top: 16, right: 16, zIndex: 5, width: 42, height: 42, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.35)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
        <X size={20} />
      </button>

      <div className="scr" style={{ position: "absolute", inset: 0, overflowY: "auto", opacity: opened ? 1 : 0, transition: "opacity .8s .25s ease" }}>
        <CouplePageContent page={d} />
      </div>

      <div style={{ position: "absolute", inset: 0, zIndex: 4, background: th.screen, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", textAlign: "center", transform: opened ? "translateY(-110%)" : "none", opacity: opened ? 0 : 1, transition: "transform .9s cubic-bezier(.7,0,.25,1), opacity .7s ease", pointerEvents: opened ? "none" : "auto" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "60%", background: `radial-gradient(60% 60% at 50% 20%, ${th.glow}, transparent)`, pointerEvents: "none" }} />
        <Heart size={76} color={th.accent} fill={th.accent} style={{ animation: "beatBig 1.6s ease-in-out infinite", position: "relative" }} />
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 30, fontWeight: 600, color: th.ink, marginTop: 22, lineHeight: 1.2, position: "relative" }}>
          {d.title || "Para você"}
        </div>
        <div style={{ fontSize: 14, color: th.sub, marginTop: 8, position: "relative" }}>uma surpresa preparada com muito amor</div>
        <div style={{ marginTop: 40, position: "relative" }}>
          <SlideToOpen th={th} onOpen={() => setOpened(true)} />
        </div>
      </div>
    </div>
  );
}

// ───────── UI helpers ─────────
function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 22, textAlign: "center" }}>
      <h2 style={h2}>{title}</h2>
      {sub && <p style={subTxt}>{sub}</p>}
    </div>
  );
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12.5, color: P.sub, marginTop: 6, textAlign: "center" }}>{children}</p>;
}
function ToggleCard({ active, onClick, icon, title, desc, mb = 16 }: any) {
  return (
    <button
      onClick={onClick}
      style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, cursor: "pointer", marginTop: 16, marginBottom: mb, border: active ? `2px solid ${P.pinkBorder}` : `1.5px dashed ${P.pinkBorder}`, background: active ? P.pinkSoft : "#fff", boxShadow: active ? `0 0 0 3px ${P.pinkSoft}` : "none" }}
    >
      <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, border: `2px solid ${active ? P.pink : "#d9c8d6"}`, background: active ? P.pink : "transparent", display: "grid", placeItems: "center" }}>
        {active && <Check size={14} color="#fff" strokeWidth={3} />}
      </span>
      <span style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: P.ink }}>{icon} {title}</div>
        <div style={{ fontSize: 12, color: P.sub, marginTop: 2 }}>{desc}</div>
      </span>
    </button>
  );
}

const h2: React.CSSProperties = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 600, color: P.ink, margin: "0 0 8px", lineHeight: 1.2 };
const subTxt: React.CSSProperties = { fontSize: 14.5, color: P.sub, margin: 0, lineHeight: 1.45 };
const lbl: React.CSSProperties = { display: "block", marginBottom: 16 };
const lblTxt: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 500, color: P.ink, marginBottom: 7 };
const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  background: "#fff",
  border: `1.5px solid ${P.cardBorder}`,
  borderRadius: 12,
  color: P.ink,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  transition: "all .2s",
};

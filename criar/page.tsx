"use client";

// app/criar/page.tsx
// Quiz de personalização com preview AO VIVO (usa o mesmo componente visual
// da página final, components/CouplePageContent.tsx) — o que o cliente vê
// no preview é literalmente o que ele vai receber depois de pago.
//
// Fluxo: preenche → salva rascunho no Firestore (status "pendente") →
// redireciona pro checkout certo da Kiwify (dentre 8 combinações de
// plano × addons) → o webhook confirma o pagamento depois.

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { emptyCouplePageDoc, type CoupleMoment } from "@/types/page";
import CouplePageContent, { THEMES } from "@/components/CouplePageContent";

// ⚠️ Troque pelos links reais dos seus 8 produtos na Kiwify.
const KIWIFY_CHECKOUT: Record<string, string> = {
  "1dia": "https://pay.kiwify.com.br/SEU-LINK-1DIA",
  "1dia-astral": "https://pay.kiwify.com.br/SEU-LINK-1DIA-ASTRAL",
  "1dia-qr": "https://pay.kiwify.com.br/SEU-LINK-1DIA-QR",
  "1dia-astral-qr": "https://pay.kiwify.com.br/SEU-LINK-1DIA-ASTRAL-QR",
  eterno: "https://pay.kiwify.com.br/SEU-LINK-ETERNO",
  "eterno-astral": "https://pay.kiwify.com.br/SEU-LINK-ETERNO-ASTRAL",
  "eterno-qr": "https://pay.kiwify.com.br/SEU-LINK-ETERNO-QR",
  "eterno-astral-qr": "https://pay.kiwify.com.br/SEU-LINK-ETERNO-ASTRAL-QR",
};

const PRICES = { "1dia": 24.9, eterno: 39.9, astral: 10, qr: 4.9 };
const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const P = {
  bg: "#fdf1f6", bgTint: "#fbe8f1", ink: "#2c2333", sub: "#a493ad",
  pink: "#ec4b93", pinkSoft: "#fbe1ec", pinkBorder: "#f26bae",
  card: "#ffffff", cardBorder: "#f2e0e9",
};

const STEPS = ["Nome", "Tema", "Data", "Mensagem", "Fotos", "Música", "Timeline", "Conta"] as const;
const EMOJI: Record<string, string> = { Nome: "📝", Tema: "🎨", Data: "📅", Mensagem: "💌", Fotos: "📷", Música: "🎵", Timeline: "🕰️", Conta: "✨" };
const CHEER = (p: number) =>
  p >= 100 ? "Tudo pronto! ♥" : p >= 72 ? "Reta final!" : p >= 45 ? "Metade do caminho!" : p >= 22 ? "Está ficando lindo!" : p > 0 ? "Ótimo começo!" : "Vamos começar!";

export default function CriarPage() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<"1dia" | "eterno">("eterno");
  const [astral, setAstral] = useState(false);
  const [qrPersonalizado, setQrPersonalizado] = useState(false);
  const [qrStyle, setQrStyle] = useState<"romantico" | "juntos">("romantico");

  const [d, setD] = useState({ ...emptyCouplePageDoc(), slug: "" });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((s) => ({ ...s, [k]: e.target.value }));

  const onPhotos = async (files: FileList | null) => {
    if (!files || !d.slug) return;
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 10 - d.photos.length)) {
      const path = `pages/${d.slug}/${Date.now()}-${file.name}`;
      const r = ref(storage, path);
      await uploadBytes(r, file);
      uploaded.push(await getDownloadURL(r));
    }
    setD((s) => ({ ...s, photos: [...s.photos, ...uploaded].slice(0, 10) }));
  };

  const onQrPhoto = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !d.slug) return;
    const path = `pages/${d.slug}/qr-${Date.now()}-${file.name}`;
    const r = ref(storage, path);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    setD((s) => ({ ...s, qrPhoto: url }));
  };

  const addMoment = () =>
    setD((s) => ({ ...s, moments: [...s.moments, { date: "", icon: "amor", title: "", desc: "" } as CoupleMoment] }));
  const updateMoment = (i: number, patch: Partial<CoupleMoment>) =>
    setD((s) => ({ ...s, moments: s.moments.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
  const removeMoment = (i: number) => setD((s) => ({ ...s, moments: s.moments.filter((_, j) => j !== i) }));

  const progress = Math.round((step / (STEPS.length - 1)) * 100);
  const last = step === STEPS.length - 1;

  const canNext = () => {
    const name = STEPS[step];
    if (name === "Nome") return d.title.trim() !== "" && d.slug.trim() !== "";
    if (name === "Data") return d.startDate !== "";
    if (name === "Mensagem") return d.message.trim() !== "";
    return true;
  };

  const total = PRICES[plan] + (astral ? PRICES.astral : 0) + (qrPersonalizado ? PRICES.qr : 0);

  const finish = async () => {
    setError("");
    if (!d.buyerName.trim() || !d.buyerEmail.trim() || d.buyerPhone.replace(/\D/g, "").length < 10) {
      setError("Preencha nome, e-mail e telefone válidos pra continuar.");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "pages", d.slug), {
        ...d,
        plan,
        astral,
        qrStyle: qrPersonalizado ? qrStyle : "simples",
        qrPaid: false, // só o webhook confirma isso, nunca o quiz
        status: "pendente",
        createdAt: Date.now(),
        paidAt: null,
      });

      const checkoutKey = [plan, astral && "astral", qrPersonalizado && "qr"].filter(Boolean).join("-");
      window.location.href = `${KIWIFY_CHECKOUT[checkoutKey]}?s=${encodeURIComponent(d.slug)}`;
    } catch (err) {
      console.error(err);
      setError("Não foi possível salvar. Tente novamente.");
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: P.bg, fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexWrap: "wrap" }}>
      <style>{`
        .qinput:focus { border-color:${P.pinkBorder} !important; box-shadow:0 0 0 3px ${P.pinkSoft}; }
        .drop:hover { border-color:${P.pinkBorder} !important; background:${P.pinkSoft} !important; }
        @media (max-width: 900px) { .preview-col { display: none; } }
      `}</style>

      {/* ───────── ESQUERDA: QUIZ ───────── */}
      <div style={{ flex: "1 1 440px", minWidth: 320, display: "flex", flexDirection: "column", background: `linear-gradient(180deg, ${P.bgTint}, ${P.bg})`, minHeight: "100vh" }}>
        <div style={{ padding: "20px 28px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: P.ink, fontWeight: 500 }}>💗 {CHEER(progress)}</span>
            <span style={{ color: P.pink, fontWeight: 600 }}>{progress}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: P.pinkSoft, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,#f871a8,${P.pink})`, transition: "width .4s ease" }} />
          </div>
        </div>

        <div style={{ flex: 1, padding: "30px 28px 20px", overflowY: "auto" }}>
          {STEPS[step] === "Nome" && (
            <>
              <Head title="Vamos criar seu presente!" sub="Escolha o link e o título da página especial." />
              <label style={lbl}>
                <span style={lblTxt}>Link da sua página</span>
                <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${P.cardBorder}`, borderRadius: 12, background: P.card }}>
                  <span style={{ padding: "12px 4px 12px 14px", color: P.sub, fontSize: 14 }}>seusite.com/</span>
                  <input
                    className="qinput"
                    value={d.slug}
                    onChange={(e) => setD((s) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                    placeholder="joao-e-maria"
                    style={{ flex: 1, border: "none", outline: "none", padding: "12px 14px 12px 0", fontSize: 14, background: "transparent" }}
                  />
                </div>
              </label>
              <label style={lbl}>
                <span style={lblTxt}>Título da página</span>
                <input className="qinput" value={d.title} onChange={set("title")} placeholder="Ex: Para o amor da minha vida" style={inp} />
              </label>
              <Hint>Este título aparece no topo da sua página — veja no preview ao lado.</Hint>
            </>
          )}

          {STEPS[step] === "Tema" && (
            <>
              <Head title="Escolha o tema da página" sub="As cores que combinam com vocês." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {Object.entries(THEMES).map(([id, t]) => {
                  const active = d.theme === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setD((s) => ({ ...s, theme: id }))}
                      style={{
                        height: 78,
                        borderRadius: 14,
                        padding: 8,
                        cursor: "pointer",
                        background: t.screen,
                        border: `2px solid ${active ? P.pinkBorder : "transparent"}`,
                        boxShadow: active ? `0 0 0 3px ${P.pinkSoft}` : "0 2px 8px rgba(120,40,90,0.1)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 16, color: t.dark ? "#fff" : "#f07bad" }}>♥</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: t.dark ? "#fff" : "#5a4a52", lineHeight: 1.1 }}>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {STEPS[step] === "Data" && (
            <>
              <Head title="Quando essa história começou?" sub="A data que marca o início de tudo." />
              <input className="qinput" type="date" value={d.startDate} onChange={set("startDate")} style={{ ...inp, textAlign: "center", fontSize: 16 }} />
              <Hint>O contador mostrará quanto tempo vocês estão juntos.</Hint>
            </>
          )}

          {STEPS[step] === "Mensagem" && (
            <>
              <Head title="Sua mensagem de amor" sub="Escreva algo que só vocês dois entendem." />
              <textarea
                className="qinput"
                rows={6}
                value={d.message}
                onChange={set("message")}
                placeholder="Desde o dia em que te conheci…"
                style={{ ...inp, resize: "vertical" as const, lineHeight: 1.5 }}
              />
              <Hint>{d.message.length}/500 caracteres</Hint>
            </>
          )}

          {STEPS[step] === "Fotos" && (
            <>
              <Head title="Adicione fotos especiais" sub="Os momentos mais marcantes do seu amor." />
              {!d.slug && <p style={{ color: "#c0392b", fontSize: 13 }}>Volte e defina o link da página antes de subir fotos.</p>}
              <label className="drop" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "26px 16px", borderRadius: 16, border: `2px dashed ${P.pinkBorder}`, background: "rgba(255,255,255,0.5)", cursor: d.slug ? "pointer" : "not-allowed", opacity: d.slug ? 1 : 0.5 }}>
                <input type="file" accept="image/*" multiple disabled={!d.slug} onChange={(e) => onPhotos(e.target.files)} style={{ display: "none" }} />
                <span style={{ fontSize: 22 }}>📷</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: P.ink }}>Adicionar fotos</span>
                <span style={{ fontSize: 12, color: P.sub }}>{d.photos.length}/10 · opcional</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 14 }}>
                {d.photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={p} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }} />
                ))}
              </div>
            </>
          )}

          {STEPS[step] === "Música" && (
            <>
              <Head title="A música de vocês" sub="Cole o link do Spotify ou YouTube." />
              <input className="qinput" value={d.music} onChange={set("music")} placeholder="https://open.spotify.com/track/…" style={inp} />
              <Hint>Vira um player embutido na página. Opcional.</Hint>
            </>
          )}

          {STEPS[step] === "Timeline" && (
            <>
              <Head title="Linha do Tempo" sub="Conte os momentos especiais da história de vocês (opcional)." />
              {d.moments.map((m, i) => (
                <div key={i} style={{ marginBottom: 14, padding: 14, borderRadius: 14, background: P.card, border: `1px solid ${P.cardBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <b style={{ fontSize: 13, color: P.pink }}>Momento {i + 1}</b>
                    <button onClick={() => removeMoment(i)} style={{ background: "none", border: "none", cursor: "pointer", color: P.sub }}>✕</button>
                  </div>
                  <input type="date" value={m.date} onChange={(e) => updateMoment(i, { date: e.target.value })} style={{ ...inp, marginBottom: 8 }} />
                  <input value={m.title} onChange={(e) => updateMoment(i, { title: e.target.value })} placeholder="Título (ex: primeira viagem)" style={{ ...inp, marginBottom: 8 }} />
                  <input value={m.desc ?? ""} onChange={(e) => updateMoment(i, { desc: e.target.value })} placeholder="Descrição (opcional)" style={inp} />
                </div>
              ))}
              <button
                onClick={addMoment}
                style={{ width: "100%", padding: 13, borderRadius: 12, border: `1.5px dashed ${P.pinkBorder}`, background: "transparent", cursor: "pointer", fontSize: 14, color: P.ink }}
              >
                + Adicionar momento
              </button>
            </>
          )}

          {STEPS[step] === "Conta" && (
            <>
              <Head title="Escolha seu plano e finalize" sub="" />
              <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                {(["1dia", "eterno"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlan(p)}
                    style={{ textAlign: "left", padding: 14, borderRadius: 12, cursor: "pointer", border: plan === p ? `2px solid ${P.pinkBorder}` : `1px solid ${P.cardBorder}`, background: plan === p ? P.pinkSoft : P.card }}
                  >
                    <b>{p === "1dia" ? "1 Dia — R$ 24,90" : "Plano Eterno — R$ 39,90"}</b>
                  </button>
                ))}
              </div>

              <ToggleCard
                active={astral}
                onClick={() => setAstral((a) => !a)}
                title="✨ Adicionar Mapa Estelar (+R$ 10,00)"
                desc="Uma constelação única gerada a partir da sua data."
              />
              <ToggleCard
                active={qrPersonalizado}
                onClick={() => setQrPersonalizado((q) => !q)}
                title="📱 QR Code Personalizado (+R$ 4,90)"
                desc="Perfeito pra imprimir num cartão e dar de presente."
                marginBottom={qrPersonalizado ? 10 : 16}
              />

              {qrPersonalizado && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {(["romantico", "juntos"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setQrStyle(s)}
                        style={{ flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 600, border: qrStyle === s ? `2px solid ${P.pinkBorder}` : `1px solid ${P.cardBorder}`, background: qrStyle === s ? P.pinkSoft : P.card, color: P.ink }}
                      >
                        {s === "romantico" ? "Romântico" : "Juntos para Sempre"}
                      </button>
                    ))}
                  </div>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, border: `1.5px dashed ${P.pinkBorder}`, fontSize: 12.5, color: P.pink, cursor: "pointer" }}>
                    <input type="file" accept="image/*" onChange={(e) => onQrPhoto(e.target.files)} style={{ display: "none" }} />
                    {d.qrPhoto ? "Trocar foto do QR" : "Adicionar foto pro centro do QR"}
                  </label>
                </div>
              )}

              <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fdf2f7", fontSize: 13, marginBottom: 16 }}>
                Total: <b>{fmtBRL(total)}</b>
              </div>

              <input value={d.buyerName} onChange={set("buyerName")} placeholder="Seu nome" style={{ ...inp, marginBottom: 10 }} className="qinput" />
              <input value={d.buyerEmail} onChange={set("buyerEmail")} placeholder="seu@email.com" type="email" style={{ ...inp, marginBottom: 10 }} className="qinput" />
              <input value={d.buyerPhone} onChange={set("buyerPhone")} placeholder="(41) 99999-9999" style={inp} className="qinput" />
              {error && <p style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{error}</p>}
            </>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${P.cardBorder}`, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(6px)", padding: "12px 20px" }}>
          <div style={{ textAlign: "center", fontSize: 12, color: P.sub, marginBottom: 10 }}>
            {EMOJI[STEPS[step]]} {STEPS[step]} · etapa {step + 1} de {STEPS.length}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ background: "none", border: "none", color: step === 0 ? "#cbbcd0" : P.sub, cursor: step === 0 ? "default" : "pointer", fontSize: 14 }}>
              ← Voltar
            </button>
            {!last ? (
              <button onClick={() => canNext() && setStep((s) => s + 1)} disabled={!canNext()} style={btn(!canNext())}>
                Continuar →
              </button>
            ) : (
              <button onClick={finish} disabled={saving} style={btn(saving)}>
                {saving ? "Salvando..." : "Ir para o pagamento →"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ───────── DIREITA: PREVIEW AO VIVO ───────── */}
      <div className="preview-col" style={{ flex: "1 1 420px", minWidth: 360, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
        <p style={{ color: P.sub, fontSize: 13, marginBottom: 16 }}>👁️ Veja como está ficando, ao vivo</p>
        <div style={{ width: 300, borderRadius: 44, padding: 10, background: "#1b1b1f", boxShadow: "0 24px 50px -18px rgba(120,40,90,0.45)" }}>
          <div style={{ borderRadius: 34, overflow: "hidden", height: 560, position: "relative" }}>
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 74, height: 20, background: "#0f0f12", borderRadius: 99, zIndex: 3 }} />
            <div style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
              <CouplePageContent page={d} compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 22, textAlign: "center" }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, color: P.ink, margin: "0 0 6px", fontFamily: "'Playfair Display', Georgia, serif" }}>{title}</h2>
      {sub && <p style={{ fontSize: 14, color: P.sub, margin: 0 }}>{sub}</p>}
    </div>
  );
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12.5, color: P.sub, marginTop: 6, textAlign: "center" }}>{children}</p>;
}
function ToggleCard({ active, onClick, title, desc, marginBottom = 16 }: { active: boolean; onClick: () => void; title: string; desc: string; marginBottom?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        cursor: "pointer",
        marginBottom,
        border: active ? `2px solid ${P.pinkBorder}` : `1.5px dashed ${P.pinkBorder}`,
        background: active ? P.pinkSoft : P.card,
      }}
    >
      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: `2px solid ${active ? P.pink : "#d9c8d6"}`, background: active ? P.pink : "transparent" }} />
      <span style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: P.ink }}>{title}</div>
        <div style={{ fontSize: 12, color: P.sub, marginTop: 2 }}>{desc}</div>
      </span>
    </button>
  );
}

const lbl: React.CSSProperties = { display: "block", marginBottom: 16 };
const lblTxt: React.CSSProperties = { display: "block", fontSize: 12, color: P.ink, marginBottom: 6 };
const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: `1.5px solid ${P.cardBorder}`,
  borderRadius: 12,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};
const btn = (disabled: boolean): React.CSSProperties => ({
  padding: "12px 26px",
  borderRadius: 99,
  border: "none",
  color: "#fff",
  fontWeight: 600,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.5 : 1,
  background: "linear-gradient(135deg,#f871a8,#ec4b93)",
});

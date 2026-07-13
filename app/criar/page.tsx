"use client";

// app/criar/page.tsx
// O quiz de personalização — versão MVP (só o estilo Clássica, conforme combinado
// pra lançar rápido). Fluxo: preenche → salva rascunho no Firestore (status "pendente")
// → redireciona pro checkout da Kiwify → o webhook confirma o pagamento depois.
//
// Isso é deliberadamente mais simples que o protótipo visual que já validamos —
// a ideia aqui é ter a "cablagem" real funcionando (Firestore + Storage + Kiwify).
// A UI completa (temas, animações, timeline visual) pode ser portada por cima
// deste esqueleto de dados assim que o fluxo estiver testado ponta a ponta.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { emptyCouplePageDoc } from "@/types/page";

// ⚠️ Troque pelos links reais dos seus produtos na Kiwify (Painel > Produtos > Link de pagamento).
// Vendemos combinações de produtos (plano × addons) em vez de usar order bump
// nativo da Kiwify — assim a decisão de comprar cada addon acontece UMA VEZ SÓ,
// aqui no quiz, sem risco de descompasso com uma segunda tela de decisão da
// Kiwify. A chave de cada link segue o padrão "plano[-astral][-qr]".
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

// Preços-base pra exibir o total (o valor real cobrado é o que você configurar
// no produto correspondente na Kiwify — mantenha os dois sincronizados).
const PRICES = {
  "1dia": 24.9,
  eterno: 39.9,
  astral: 10, // 1 Dia+Astral R$34,90 (+10) · Eterno+Astral R$49,90 (+10)
  qr: 4.9,
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STEPS = ["Nome", "Data", "Mensagem", "Fotos", "Música", "Conta"] as const;

export default function CriarPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<"1dia" | "eterno">("eterno");
  const [astral, setAstral] = useState(false);
  const [qrPersonalizado, setQrPersonalizado] = useState(false);
  const [qrStyle, setQrStyle] = useState<"romantico" | "juntos">("romantico");

  const [d, setD] = useState({
    ...emptyCouplePageDoc(),
    slug: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((s) => ({ ...s, [k]: e.target.value }));

  const onPhotos = async (files: FileList | null) => {
    if (!files || !d.slug) return;
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 10 - d.photos.length)) {
      const path = `pages/${d.slug}/${Date.now()}-${file.name}`;
      const r = ref(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      uploaded.push(url);
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

  const progress = Math.round((step / (STEPS.length - 1)) * 100);
  const last = step === STEPS.length - 1;

  const canNext = () => {
    if (STEPS[step] === "Nome") return d.title.trim() !== "" && d.slug.trim() !== "";
    if (STEPS[step] === "Data") return d.startDate !== "";
    if (STEPS[step] === "Mensagem") return d.message.trim() !== "";
    return true;
  };

  const finish = async () => {
    setError("");
    if (!d.buyerName.trim() || !d.buyerEmail.trim()) {
      setError("Preencha nome e e-mail pra continuar.");
      return;
    }
    setSaving(true);
    try {
      // Salva o rascunho ANTES do pagamento — se o cliente fechar a aba,
      // ele não perde o trabalho: pode voltar e o slug já existe (status "pendente").
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

      const checkoutKey = [plan, astral && "astral", qrPersonalizado && "qr"]
        .filter(Boolean)
        .join("-");
      const checkoutUrl = `${KIWIFY_CHECKOUT[checkoutKey]}?s=${encodeURIComponent(d.slug)}`;
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      setError("Não foi possível salvar. Tente novamente.");
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#fbe8f1,#fdf1f6)",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: "40px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        {/* barra de progresso */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: "#2c2333", fontWeight: 500 }}>{STEPS[step]}</span>
            <span style={{ color: "#ec4b93", fontWeight: 600 }}>{progress}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "#fbe1ec", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg,#f871a8,#ec4b93)",
                transition: "width .4s ease",
              }}
            />
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: 24, border: "1px solid #f2e0e9" }}>
          {STEPS[step] === "Nome" && (
            <>
              <h2 style={h2}>Vamos criar seu presente!</h2>
              <label style={lbl}>
                <span style={lblTxt}>Link da página</span>
                <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #f2e0e9", borderRadius: 12 }}>
                  <span style={{ padding: "12px 4px 12px 14px", color: "#a493ad", fontSize: 14 }}>seusite.com/</span>
                  <input
                    value={d.slug}
                    onChange={(e) =>
                      setD((s) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))
                    }
                    placeholder="joao-e-maria"
                    style={{ flex: 1, border: "none", outline: "none", padding: "12px 14px 12px 0", fontSize: 14 }}
                  />
                </div>
              </label>
              <label style={lbl}>
                <span style={lblTxt}>Título da página</span>
                <input value={d.title} onChange={set("title")} placeholder="Ex: Para o amor da minha vida" style={inp} />
              </label>
            </>
          )}

          {STEPS[step] === "Data" && (
            <>
              <h2 style={h2}>Quando essa história começou?</h2>
              <input type="date" value={d.startDate} onChange={set("startDate")} style={inp} />
            </>
          )}

          {STEPS[step] === "Mensagem" && (
            <>
              <h2 style={h2}>Sua mensagem de amor</h2>
              <textarea
                rows={6}
                value={d.message}
                onChange={set("message")}
                placeholder="Escreva aqui tudo o que você sente..."
                style={{ ...inp, resize: "vertical" as const }}
              />
            </>
          )}

          {STEPS[step] === "Fotos" && (
            <>
              <h2 style={h2}>Adicione fotos especiais</h2>
              {!d.slug && <p style={{ color: "#c0392b", fontSize: 13 }}>Volte e defina o link da página antes de subir fotos.</p>}
              <input type="file" accept="image/*" multiple onChange={(e) => onPhotos(e.target.files)} disabled={!d.slug} />
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
              <h2 style={h2}>A música de vocês</h2>
              <input value={d.music} onChange={set("music")} placeholder="https://open.spotify.com/track/…" style={inp} />
            </>
          )}

          {STEPS[step] === "Conta" && (
            <>
              <h2 style={h2}>Escolha seu plano e finalize</h2>
              <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                {(["1dia", "eterno"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlan(p)}
                    style={{
                      textAlign: "left",
                      padding: 14,
                      borderRadius: 12,
                      cursor: "pointer",
                      border: plan === p ? "2px solid #f26bae" : "1px solid #f2e0e9",
                      background: plan === p ? "#fbe1ec" : "#fff",
                    }}
                  >
                    <b>{p === "1dia" ? "1 Dia — R$ 24,90" : "Plano Eterno — R$ 39,90"}</b>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setAstral((a) => !a)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  cursor: "pointer",
                  marginBottom: 10,
                  border: astral ? "2px solid #f26bae" : "1.5px dashed #f26bae",
                  background: astral ? "#fbe1ec" : "#fff",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `2px solid ${astral ? "#ec4b93" : "#d9c8d6"}`,
                    background: astral ? "#ec4b93" : "transparent",
                  }}
                />
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#2c2333" }}>
                    ✨ Adicionar Mapa Estelar (+R$ 10,00)
                  </div>
                  <div style={{ fontSize: 12, color: "#a493ad", marginTop: 2 }}>
                    Uma constelação única gerada a partir da sua data.
                  </div>
                </span>
              </button>

              <button
                onClick={() => setQrPersonalizado((q) => !q)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  cursor: "pointer",
                  marginBottom: qrPersonalizado ? 10 : 16,
                  border: qrPersonalizado ? "2px solid #f26bae" : "1.5px dashed #f26bae",
                  background: qrPersonalizado ? "#fbe1ec" : "#fff",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `2px solid ${qrPersonalizado ? "#ec4b93" : "#d9c8d6"}`,
                    background: qrPersonalizado ? "#ec4b93" : "transparent",
                  }}
                />
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#2c2333" }}>
                    📱 QR Code Personalizado (+R$ 4,90)
                  </div>
                  <div style={{ fontSize: 12, color: "#a493ad", marginTop: 2 }}>
                    Perfeito pra imprimir num cartão e dar de presente.
                  </div>
                </span>
              </button>

              {qrPersonalizado && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {(["romantico", "juntos"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setQrStyle(s)}
                        style={{
                          flex: 1,
                          padding: "10px 8px",
                          borderRadius: 10,
                          cursor: "pointer",
                          fontSize: 12.5,
                          fontWeight: 600,
                          border: qrStyle === s ? "2px solid #f26bae" : "1px solid #f2e0e9",
                          background: qrStyle === s ? "#fbe1ec" : "#fff",
                          color: "#2c2333",
                        }}
                      >
                        {s === "romantico" ? "Romântico" : "Juntos para Sempre"}
                      </button>
                    ))}
                  </div>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: "1.5px dashed #f26bae",
                      fontSize: 12.5,
                      color: "#ec4b93",
                      cursor: "pointer",
                    }}
                  >
                    <input type="file" accept="image/*" onChange={(e) => onQrPhoto(e.target.files)} style={{ display: "none" }} />
                    {d.qrPhoto ? "Trocar foto do QR" : "Adicionar foto pro centro do QR"}
                  </label>
                  {d.qrPhoto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.qrPhoto} alt="" style={{ width: 40, height: 40, borderRadius: "50%", marginLeft: 10, verticalAlign: "middle" }} />
                  )}
                </div>
              )}

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "#fdf2f7",
                  fontSize: 13,
                  color: "#2c2333",
                  marginBottom: 16,
                }}
              >
                Total:{" "}
                <b>
                  {fmtBRL(
                    PRICES[plan] + (astral ? PRICES.astral : 0) + (qrPersonalizado ? PRICES.qr : 0)
                  )}
                </b>
              </div>
              <input value={d.buyerName} onChange={set("buyerName")} placeholder="Seu nome" style={{ ...inp, marginBottom: 10 }} />
              <input value={d.buyerEmail} onChange={set("buyerEmail")} placeholder="seu@email.com" type="email" style={{ ...inp, marginBottom: 10 }} />
              <input value={d.buyerPhone} onChange={set("buyerPhone")} placeholder="(41) 99999-9999" style={inp} />
              {error && <p style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{error}</p>}
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{ background: "none", border: "none", color: "#a493ad", cursor: step === 0 ? "default" : "pointer" }}
          >
            ← Voltar
          </button>
          {!last ? (
            <button
              onClick={() => canNext() && setStep((s) => s + 1)}
              disabled={!canNext()}
              style={btn(!canNext())}
            >
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
  );
}

const h2: React.CSSProperties = { fontSize: 22, fontWeight: 600, color: "#2c2333", marginBottom: 18 };
const lbl: React.CSSProperties = { display: "block", marginBottom: 14 };
const lblTxt: React.CSSProperties = { display: "block", fontSize: 12, color: "#2c2333", marginBottom: 6 };
const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: "1.5px solid #f2e0e9",
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

// app/admin/leads/page.tsx
// Quem montou a Retrospectiva e não pagou, com o link da prévia de cada um e
// botões de WhatsApp / e-mail com a mensagem pronta. Abra em:
//   /admin/leads?chave=SUA_ADMIN_KEY            (últimos 7 dias)
//   /admin/leads?chave=...&dias=30
//
// Duas origens:
//   • pages "pendente"  → chegou a clicar em pagar (tem nome, e-mail e WhatsApp)
//   • rascunhos         → parou antes do pagamento (só tem contato se digitou)
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import { linkPreviaPagina, linkPreviaRascunho } from "@/lib/previa";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leads · FromMyHeart", robots: { index: false, follow: false } };

type Lead = {
  origem: "checkout" | "rascunho";
  quando: number;
  nome: string;
  para: string;
  email: string;
  fone: string;
  etapa: string;
  previa: string;
};

const ETAPAS_RETRO = ["Estilo", "Visual", "Casal", "Meses", "Músicas", "Números", "Promessas", "Mensagem", "Finalizar"];

// fora do componente: o lint do React não deixa chamar Date.now() direto no render
const inicioDaJanela = (dias: number) => Date.now() - dias * 86400_000;

function haQuanto(t: number) {
  const min = Math.round((Date.now() - t) / 60_000);
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

function waLink(fone: string, texto: string) {
  let n = fone.replace(/\D/g, "");
  if (n.length === 10 || n.length === 11) n = "55" + n;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

function mensagem(l: Lead) {
  return `Oi! Vi que você começou a retrospectiva de vocês e ela ficou salva aqui 💛 ${l.previa}\n\nAconteceu alguma coisa na hora de finalizar? Se quiser terminar, separei 10% de desconto pra você com o cupom AMOR10 😊`;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ chave?: string; dias?: string }> }) {
  const sp = await searchParams;
  const chave = process.env.ADMIN_KEY;
  if (!chave || sp.chave !== chave) notFound();

  const dias = Math.min(60, Math.max(1, Number(sp.dias) || 7));
  const desde = inicioDaJanela(dias);
  const db = getAdminDb();

  // Só filtros de 1 campo (não precisa criar índice composto no Firestore).
  const [pend, rasc] = await Promise.all([
    db.collection("pages").where("status", "==", "pendente").limit(500).get(),
    db.collection("rascunhos").where("atualizadoEm", ">=", desde).orderBy("atualizadoEm", "desc").limit(500).get(),
  ]);

  const leads: Lead[] = [];
  const slugsComCheckout = new Set<string>();

  for (const doc of pend.docs) {
    const p = doc.data();
    if (p.style !== "retro" || (p.createdAt ?? 0) < desde) continue;
    slugsComCheckout.add(doc.id);
    leads.push({
      origem: "checkout",
      quando: p.createdAt ?? 0,
      nome: String(p.buyerName ?? "").trim(),
      para: String(p.retroNameB ?? "").trim(),
      email: String(p.buyerEmail ?? "").trim(),
      fone: String(p.buyerPhone ?? "").trim(),
      etapa: "Clicou em pagar",
      previa: linkPreviaPagina(doc.id),
    });
  }

  // Rascunhos: pula os que já viraram página (pendente ou paga) — esses já
  // aparecem acima ou já compraram.
  const slugsRasc = [...new Set(rasc.docs.map((r) => String(r.data()?.d?.slug ?? "").replace(/-+$/, "")).filter(Boolean))];
  const pagos = new Set<string>();
  for (let i = 0; i < slugsRasc.length; i += 100) {
    const refs = slugsRasc.slice(i, i + 100).map((s) => db.collection("pages").doc(s));
    if (!refs.length) continue;
    const snaps = await db.getAll(...refs);
    snaps.forEach((s) => s.exists && s.data()?.status === "pago" && pagos.add(s.id));
  }

  let semContato = 0;
  let rascRetro = 0;
  for (const doc of rasc.docs) {
    const r = doc.data();
    const d = r.d ?? {};
    if (r.produto !== "retro") continue;
    const slug = String(d.slug ?? "").replace(/-+$/, "");
    if (slug && (slugsComCheckout.has(slug) || pagos.has(slug))) continue;
    rascRetro++;
    const email = String(d.buyerEmail || r.email || "").trim();
    const fone = String(d.buyerPhone ?? "").trim();
    if (!email && fone.replace(/\D/g, "").length < 10) {
      semContato++;
      continue;
    }
    leads.push({
      origem: "rascunho",
      quando: r.atualizadoEm ?? r.criadoEm ?? 0,
      nome: String(d.buyerName || d.retroNameA || "").trim(),
      para: String(d.retroNameB ?? "").trim(),
      email,
      fone,
      etapa: `Parou em: ${ETAPAS_RETRO[Number(r.step) || 0] ?? "?"}`,
      previa: linkPreviaRascunho(doc.id),
    });
  }

  leads.sort((a, b) => b.quando - a.quando);

  const card: React.CSSProperties = { border: "1px solid #F3D3DF", borderRadius: 14, padding: "14px 16px", marginBottom: 12, background: "#fff" };
  const btn = (bg: string): React.CSSProperties => ({ display: "inline-block", padding: "7px 12px", borderRadius: 99, background: bg, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", marginRight: 8, marginTop: 8 });
  const link = (d: number) => `/admin/leads?chave=${encodeURIComponent(sp.chave ?? "")}&dias=${d}`;

  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", maxWidth: 820, margin: "0 auto", padding: "28px 18px 60px", color: "#3A1430", background: "#FFF8FA", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Leads da Retrospectiva</h1>
      <p style={{ margin: "0 0 14px", color: "#7A4B6B", fontSize: 14 }}>Quem montou e não pagou · últimos {dias} dias</p>
      <nav style={{ display: "flex", gap: 8, marginBottom: 18, fontSize: 13 }}>
        {[1, 3, 7, 30].map((d) => (
          <a key={d} href={link(d)} style={{ padding: "6px 12px", borderRadius: 99, background: d === dias ? "#3A1430" : "#F3E8EE", color: d === dias ? "#fff" : "#3A1430", textDecoration: "none" }}>{d === 1 ? "24 h" : `${d} dias`}</a>
        ))}
      </nav>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          ["Clicaram em pagar", leads.filter((l) => l.origem === "checkout").length],
          ["Rascunhos com contato", leads.filter((l) => l.origem === "rascunho").length],
          ["Rascunhos sem contato", semContato],
        ].map(([t, n]) => (
          <div key={String(t)} style={{ flex: "1 1 160px", padding: "12px 14px", borderRadius: 14, background: "#FBE3EC" }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{n}</div>
            <div style={{ fontSize: 13, color: "#7A4B6B" }}>{t}</div>
          </div>
        ))}
      </div>
      {semContato > 0 && (
        <p style={{ fontSize: 13, color: "#7A4B6B", margin: "-6px 0 20px" }}>
          {semContato} de {rascRetro} rascunhos não deixaram e-mail nem WhatsApp: não tem como recuperar esses.
        </p>
      )}

      {leads.length === 0 && <p style={{ padding: 18, borderRadius: 14, background: "#FBE3EC" }}>Nenhum lead nesse período.</p>}

      {leads.map((l) => (
        <div key={l.previa} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <b style={{ fontSize: 16 }}>
              {l.nome || "(sem nome)"}
              {l.para && <span style={{ fontWeight: 400, color: "#7A4B6B" }}> → {l.para}</span>}
            </b>
            <span style={{ fontSize: 12.5, color: "#7A4B6B" }}>{haQuanto(l.quando)}</span>
          </div>
          <div style={{ fontSize: 13, color: "#7A4B6B", marginTop: 4 }}>
            <span style={{ padding: "2px 8px", borderRadius: 99, background: l.origem === "checkout" ? "#FFE3C2" : "#E9E2F5", color: "#3A1430", marginRight: 8 }}>{l.etapa}</span>
            {l.email} {l.fone && `· ${l.fone}`}
          </div>
          <div>
            <a href={l.previa} target="_blank" rel="noreferrer" style={btn("#3A1430")}>Ver prévia</a>
            {l.fone.replace(/\D/g, "").length >= 10 && (
              <a href={waLink(l.fone, mensagem(l))} target="_blank" rel="noreferrer" style={btn("#1F9D72")}>WhatsApp</a>
            )}
            {l.email && (
              <a href={`mailto:${l.email}?subject=${encodeURIComponent("Sua retrospectiva ficou salva 💛")}&body=${encodeURIComponent(mensagem(l))}`} style={btn("#E8336D")}>E-mail</a>
            )}
          </div>
        </div>
      ))}
    </main>
  );
}

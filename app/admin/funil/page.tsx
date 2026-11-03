// app/admin/funil/page.tsx
// Painel do funil: quantas pessoas entram em cada etapa do /criar, onde
// desistem e quantas pagam. Abra em:
//   /admin/funil?chave=SUA_ADMIN_KEY            (últimos 7 dias, Retrospectiva)
//   /admin/funil?chave=...&dias=30&produto=classica
// A chave é a variável ADMIN_KEY na Vercel (invente uma senha longa).
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase-admin";
import { ultimosDias } from "@/lib/funil-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Funil · FromMyHeart", robots: { index: false, follow: false } };

type Mapa = Record<string, number>;
const NOMES: Record<string, string> = {
  inicio: "Abriu o formulário",
  checkout: "Clicou em pagar",
  pago: "Pagou (webhook)",
  rascunho: "Rascunho salvo na nuvem",
  rascunho_email: "Pediu o link por e-mail",
  retomou: "Voltou por um rascunho",
  upload_ok: "Fotos enviadas",
  upload_erro: "Fotos com erro",
};

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default async function FunilPage({ searchParams }: { searchParams: Promise<{ chave?: string; dias?: string; produto?: string }> }) {
  const sp = await searchParams;
  const chave = process.env.ADMIN_KEY;
  if (!chave || sp.chave !== chave) notFound();

  const dias = Math.min(90, Math.max(1, Number(sp.dias) || 7));
  const produto = ["retro", "classica", "date"].includes(String(sp.produto)) ? String(sp.produto) : "retro";
  const ids = ultimosDias(dias);
  const db = getAdminDb();
  const snaps = await db.getAll(...ids.map((id) => db.collection("funil").doc(id)));

  const total: Mapa = {};
  const porDia = snaps.map((s, i) => {
    const m: Mapa = (s.data()?.[produto] as Mapa) ?? {};
    for (const [k, v] of Object.entries(m)) total[k] = (total[k] ?? 0) + (Number(v) || 0);
    return { dia: ids[i], m };
  });

  const etapas = Object.keys(total).filter((k) => k.startsWith("etapa:")).sort();
  const funil = ["inicio", ...etapas, "checkout", "pago"].filter((k, i, a) => a.indexOf(k) === i);
  const base = total.inicio || total[etapas[0]] || 0;
  const outros = Object.keys(total).filter((k) => !funil.includes(k)).sort();
  const nome = (k: string) => NOMES[k] ?? (k.startsWith("etapa:") ? `Etapa ${k.slice(6).replace("-", " · ").replace(/_/g, " ")}` : k.startsWith("pulou:") ? `Pulou: ${k.slice(6)}` : k);

  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #E8336D", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "#7A4B6B" };
  const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #F3D3DF", fontSize: 14 };
  const link = (p: string, d: number) => `/admin/funil?chave=${encodeURIComponent(sp.chave ?? "")}&produto=${p}&dias=${d}`;

  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", maxWidth: 820, margin: "0 auto", padding: "28px 18px 60px", color: "#3A1430" }}>
      <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Funil do /criar</h1>
      <p style={{ margin: "0 0 16px", color: "#7A4B6B", fontSize: 14 }}>
        Últimos {dias} dias · {produto} · cada pessoa conta 1 vez por etapa por sessão
      </p>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22, fontSize: 13 }}>
        {["retro", "classica", "date"].map((p) => (
          <a key={p} href={link(p, dias)} style={{ padding: "6px 12px", borderRadius: 99, background: p === produto ? "#E8336D" : "#FBE3EC", color: p === produto ? "#fff" : "#3A1430", textDecoration: "none" }}>{p}</a>
        ))}
        <span style={{ width: 10 }} />
        {[1, 7, 30].map((d) => (
          <a key={d} href={link(produto, d)} style={{ padding: "6px 12px", borderRadius: 99, background: d === dias ? "#3A1430" : "#F3E8EE", color: d === dias ? "#fff" : "#3A1430", textDecoration: "none" }}>{d === 1 ? "hoje" : `${d} dias`}</a>
        ))}
      </nav>

      {base === 0 ? (
        <p style={{ padding: 18, borderRadius: 14, background: "#FBE3EC" }}>Ainda não chegou nenhum evento nesse período.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {[
              ["Começaram", total.inicio ?? base],
              ["Chegaram no pagamento", total.checkout ?? 0],
              ["Pagaram", total.pago ?? 0],
              ["Conclusão (pagou ÷ começou)", pct(total.pago ?? 0, base)],
            ].map(([t, v]) => (
              <div key={String(t)} style={{ flex: "1 1 160px", padding: "14px 16px", borderRadius: 14, background: "#FFF1F5", border: "1px solid #F3D3DF" }}>
                <div style={{ fontSize: 12, color: "#7A4B6B" }}>{t}</div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{v}</div>
              </div>
            ))}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
            <thead>
              <tr>
                <th style={th}>Etapa</th>
                <th style={th}>Pessoas</th>
                <th style={th}>Do início</th>
                <th style={th}>Saíram aqui</th>
                <th style={{ ...th, width: "30%" }} />
              </tr>
            </thead>
            <tbody>
              {funil.map((k, i) => {
                const v = total[k] ?? 0;
                const ant = i > 0 ? total[funil[i - 1]] ?? 0 : v;
                const saiu = i > 0 && ant > 0 ? Math.max(0, ant - v) : 0;
                const perda = i > 0 && ant > 0 ? saiu / ant : 0;
                return (
                  <tr key={k}>
                    <td style={{ ...td, fontWeight: 600 }}>{nome(k)}</td>
                    <td style={td}>{v}</td>
                    <td style={td}>{pct(v, base)}</td>
                    <td style={{ ...td, color: perda >= 0.25 ? "#C0392B" : "#7A4B6B", fontWeight: perda >= 0.25 ? 700 : 400 }}>
                      {i === 0 ? "—" : `${saiu} (${pct(saiu, ant)})`}
                    </td>
                    <td style={td}>
                      <div style={{ height: 10, borderRadius: 99, background: "#F3E8EE" }}>
                        <div style={{ height: "100%", width: pct(v, base), maxWidth: "100%", borderRadius: 99, background: "#E8336D" }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: 12.5, color: "#7A4B6B", margin: "-18px 0 28px" }}>Em vermelho: etapas onde 25% ou mais das pessoas desistiram. É ali que vale mexer primeiro.</p>

          {outros.length > 0 && (
            <>
              <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Outros eventos</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
                <tbody>
                  {outros.map((k) => (
                    <tr key={k}>
                      <td style={td}>{nome(k)}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{total[k]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h2 style={{ fontSize: 17, margin: "0 0 8px" }}>Por dia</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Dia</th>
                <th style={th}>Começaram</th>
                <th style={th}>Pagamento</th>
                <th style={th}>Pagaram</th>
                <th style={th}>Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {porDia.map(({ dia, m }) => (
                <tr key={dia}>
                  <td style={td}>{dia.split("-").reverse().join("/")}</td>
                  <td style={td}>{m.inicio ?? 0}</td>
                  <td style={td}>{m.checkout ?? 0}</td>
                  <td style={td}>{m.pago ?? 0}</td>
                  <td style={td}>{pct(m.pago ?? 0, m.inicio ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}

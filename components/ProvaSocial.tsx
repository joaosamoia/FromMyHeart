// components/ProvaSocial.tsx
// Depoimentos reais (lib/prova-social.ts). Lista vazia = nada aparece.
import Link from "next/link";
import { DEPOIMENTOS } from "@/lib/prova-social";
import { BR, D_FONT } from "@/components/brand";

export default function ProvaSocial({ variante = "escura", max = 3, titulo }: { variante?: "escura" | "clara"; max?: number; titulo?: string }) {
  const lista = DEPOIMENTOS.slice(0, max);
  if (!lista.length) return null;
  const escura = variante === "escura";
  return (
    <div style={{ marginTop: escura ? 0 : 22 }}>
      {titulo && <div style={{ fontFamily: D_FONT, fontWeight: 800, fontSize: 22, marginBottom: 12, color: escura ? BR.cream : BR.wine }}>{titulo}</div>}
      {!titulo && !escura && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", color: BR.mutedInk, marginBottom: 8 }}>QUEM JÁ DEU DE PRESENTE</div>}
      <div style={{ display: "grid", gap: 10 }}>
        {lista.map((d) => (
          <figure key={d.nome + d.texto.slice(0, 12)} style={{ margin: 0, padding: "14px 16px", borderRadius: 16, background: escura ? "rgba(255,255,255,.07)" : "#fff", border: `1px solid ${escura ? "rgba(255,255,255,.12)" : BR.line}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
            {d.foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.foto} alt="" width={52} height={52} style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
            )}
            <div>
              <blockquote style={{ margin: "0 0 6px", fontSize: 14, lineHeight: 1.45, color: escura ? BR.cream : BR.wine }}>“{d.texto}”</blockquote>
              <figcaption style={{ fontSize: 12.5, color: escura ? BR.muted : BR.mutedInk }}>
                {d.nome}
                {d.cidade ? ` · ${d.cidade}` : ""}
                {d.link && (
                  <>
                    {" · "}
                    <Link href={d.link} style={{ color: escura ? BR.yellow : BR.pink, fontWeight: 700 }}>ver a página</Link>
                  </>
                )}
              </figcaption>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}

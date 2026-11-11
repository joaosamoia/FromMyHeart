// components/Suporte.tsx
// Link discreto de "fala comigo no WhatsApp". Fica perto do botão de pagar e
// nos rodapés: tira a dúvida na hora sem tirar a pessoa do caminho da compra.
import { MessageCircle } from "lucide-react";
import { linkSuporte } from "@/lib/suporte";

export default function Suporte({
  texto = "Ficou com alguma dúvida? Fala com a gente no WhatsApp",
  mensagem,
  cor = "#8A6B86",
  destaque = "#1F9D72",
  margem = "14px 0 0",
}: {
  texto?: string;
  mensagem?: string; // texto que já vai escrito na conversa
  cor?: string;
  destaque?: string;
  margem?: string;
}) {
  return (
    <div style={{ textAlign: "center", margin: margem }}>
      <a
        href={linkSuporte(mensagem)}
        target="_blank"
        rel="noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, color: cor, textDecoration: "none", fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <MessageCircle size={16} color={destaque} />
        <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{texto}</span>
      </a>
    </div>
  );
}

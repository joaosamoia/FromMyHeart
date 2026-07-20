// app/page.tsx — landing mínima. Troque depois por uma página de vendas de verdade.
import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg,#fbe8f1,#fdf1f6)",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>♥</div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "#2c2333", marginBottom: 8 }}>
        Site do Amor
      </h1>
      <p style={{ color: "#a493ad", marginBottom: 24, maxWidth: 340 }}>
        Crie uma página personalizada e surpreenda quem você ama.
      </p>
      <Link
        href="/criar"
        style={{
          padding: "14px 30px",
          borderRadius: 99,
          background: "linear-gradient(135deg,#f871a8,#ec4b93)",
          color: "#fff",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Criar minha página →
      </Link>

      <p style={{ color: "#a493ad", fontSize: 13.5, marginTop: 28 }}>
        Quer só chamar alguém pra sair?{" "}
        <Link href="/date" style={{ color: "#ec4b93", fontWeight: 600 }}>
          Faça um convite de date 🐧
        </Link>
      </p>
    </div>
  );
}

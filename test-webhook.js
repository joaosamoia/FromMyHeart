// test-webhook.js
//
// Simula uma chamada REAL da Kiwify pro seu webhook — sem precisar pagar de
// verdade. Calcula a assinatura HMAC-SHA1 do mesmo jeito que a Kiwify faz,
// então o seu código de verificação aceita normalmente.
//
// COMO USAR:
//   1. Preenche as 3 variáveis abaixo (SECRET, SLUG, TARGET_URL).
//   2. Roda no terminal, dentro da pasta do projeto:
//        node test-webhook.js
//   3. Confere o Firestore, o e-mail, e a página /slug.
//
// Rode `npm install` antes se ainda não tiver feito (usa só módulos nativos
// do Node, então nem precisa de pacote extra).

const crypto = require("crypto");
const https = require("https");
const http = require("http");

// ─────────────── PREENCHA AQUI ───────────────
const SECRET = "a91fjt3i960"; // o mesmo valor de KIWIFY_WEBHOOK_SECRET
const SLUG = "coloque-aqui-o-slug-que-voce-criou-no-quiz"; // ex: joao-e-maria
const TARGET_URL = "http://localhost:3000/api/webhooks/kiwify";
// Pra testar no site JÁ PUBLICADO em vez do local, troca por algo como:
// const TARGET_URL = "https://from-my-heart-pi.vercel.app/api/webhooks/kiwify";
// ───────────────────────────────────────────────

// Corpo de exemplo, no mesmo formato que vimos chegar de verdade da Kiwify
// no teste anterior (order_status: "paid" = aprovado).
const body = JSON.stringify({
  order_id: "teste-local-" + Date.now(),
  order_status: "paid",
  product_type: "membership",
  payment_method: "credit_card",
});

const signature = crypto.createHmac("sha1", SECRET).update(body).digest("hex");
const urlWithParams = `${TARGET_URL}?s=${encodeURIComponent(SLUG)}&signature=${signature}`;

const target = new URL(urlWithParams);
const client = target.protocol === "https:" ? https : http;

const req = client.request(
  target,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Resposta: ${data}`);
      if (res.statusCode === 200) {
        console.log("\n✅ Webhook aceito! Confere agora o Firestore, o e-mail e a página /" + SLUG);
      } else {
        console.log("\n⚠️ Algo não deu certo — confere o SECRET e o SLUG preenchidos no topo do arquivo.");
      }
    });
  }
);

req.on("error", (err) => {
  console.error("Erro ao conectar:", err.message);
  console.error("Se estiver testando local, confirma que 'npm run dev' está rodando em outro terminal.");
});

req.write(body);
req.end();

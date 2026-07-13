# Site do Amor — MVP

Projeto Next.js real por trás do produto: quiz de personalização (`/criar`),
página pública do casal (`/[slug]`) e webhook de pagamento da Kiwify.

## O que já está pronto

- **`/criar`** — quiz simplificado (estilo Clássica): nome/link, data, mensagem,
  fotos (upload real pro Firebase Storage), música, e finalização com escolha
  de plano. Salva um rascunho no Firestore (`status: "pendente"`) e redireciona
  pro checkout da Kiwify.
- **`/[slug]`** — página pública do casal. Só renderiza o conteúdo se
  `status === "pago"`; senão mostra "esta página ainda não foi ativada".
  Já vem com `generateMetadata` pra o link ficar bonito no WhatsApp/iMessage.
- **`/api/webhooks/kiwify`** — recebe a confirmação da Kiwify e libera a página.
- **`firestore.rules`** / **`storage.rules`** — regras de segurança prontas pra
  colar no console (bloqueiam tudo por padrão, abrem só o necessário).

## O que falta você configurar antes do primeiro deploy

### 1. Variáveis de ambiente
Copie `.env.local.example` para `.env.local` e preencha:
- As 6 chaves `NEXT_PUBLIC_FIREBASE_*` (você já tem, do console do Firebase).
- `FIREBASE_SERVICE_ACCOUNT_KEY`: vá em **Firebase Console → Configurações do
  Projeto → Contas de serviço → Gerar nova chave privada**. Baixa um JSON — cole
  o conteúdo inteiro (em uma linha só) nessa variável.
- `KIWIFY_WEBHOOK_SECRET`: defina quando configurar o webhook no painel da Kiwify.

### 2. Regras de segurança
No Firebase Console:
- **Firestore Database → Regras** → cole o conteúdo de `firestore.rules` → Publicar.
- **Storage → Regras** → cole o conteúdo de `storage.rules` → Publicar.

### 3. Cadastrar os produtos na Kiwify
Em vez de usar o "order bump" nativo da Kiwify, vendemos combinações de
produtos (plano × addons) — isso evita o cliente marcar um addon no quiz e
depois desmarcar (ou esquecer) na tela de pagamento da própria Kiwify, ou
vice-versa. A decisão acontece uma única vez, no quiz.

São 2 addons independentes — **Mapa Estelar** (+R$10) e **QR Code
Personalizado** (+R$4,90) — combinados com os 2 planos, dando até 8 produtos:

| Produto | Preço |
|---|---|
| 1 Dia | R$ 24,90 |
| 1 Dia + Mapa Estelar | R$ 34,90 |
| 1 Dia + QR Personalizado | R$ 29,80 |
| 1 Dia + Mapa Estelar + QR | R$ 39,80 |
| Plano Eterno | R$ 39,90 |
| Plano Eterno + Mapa Estelar | R$ 49,90 |
| Plano Eterno + QR Personalizado | R$ 44,80 |
| Plano Eterno + Mapa Estelar + QR | R$ 54,80 |

Em `app/criar/page.tsx`, procure `KIWIFY_CHECKOUT` e troque pelos 8 links reais
(Painel Kiwify → Produtos → Link de pagamento de cada um).

No `.env.local`, preencha `KIWIFY_PRODUCT_IDS_ASTRAL` e `KIWIFY_PRODUCT_IDS_QR`
com os IDs dos produtos que incluem cada addon (um produto "combo" entra nas
duas listas) — é assim que o webhook sabe quais recursos liberar na página,
sem precisar de um ID por combinação.

### 4. Webhook da Kiwify
1. No painel da Kiwify: **Apps → Webhooks → Criar Webhook**.
2. URL: `https://SEU-DOMINIO.com/api/webhooks/kiwify`
3. Evento: pedido aprovado / compra aprovada.
4. **Antes de confiar no fluxo**: clique em "Testar Webhook" e depois em
   "Ver logs" pra conferir o formato exato do JSON que a Kiwify está enviando.
   Ajuste a função `extractOrderInfo()` em
   `app/api/webhooks/kiwify/route.ts` se os nomes dos campos forem diferentes
   do que o código já espera (isso está bem comentado no arquivo).

### 5. Deploy na Vercel
```bash
npm install -g vercel   # ou use o site vercel.com
vercel login
vercel                  # primeiro deploy (vai pedir pra linkar ao projeto)
vercel --prod           # deploy de produção
```
Ou simplesmente conecte o repositório do GitHub direto no dashboard da Vercel
— ele detecta Next.js automaticamente. Depois, cole as mesmas variáveis de
ambiente em **Project Settings → Environment Variables**.

## Rodando localmente

```bash
npm install
npm run dev
```
Abre em `http://localhost:3000`. `/criar` já vai gravar de verdade no seu
Firestore (cuidado: mesmo em localhost, ele escreve no banco real).

## Testando o fluxo ponta a ponta antes de divulgar

1. Preencha o quiz em `/criar` até o fim.
2. Confirme que o documento apareceu no Firestore com `status: "pendente"`.
3. Complete uma compra de teste na Kiwify (ou use o botão "Testar Webhook").
4. Confirme que o `status` do documento virou `"pago"`.
5. Abra `/[slug]` e confirme que a página aparece corretamente.
6. Cole o link no WhatsApp pra si mesmo e confirme que o preview (título/foto)
   aparece bonito.

## O que ainda não está aqui (próximos passos combinados)

- UI completa do quiz (temas, timeline visual, animações) — este MVP tem a
  versão funcional simplificada; a versão visual rica pode ser portada por
  cima deste esqueleto de dados já validado.
- Estilos "Date" e "Mapa Estelar" (order bump) como fluxos próprios.
- Envio de e-mail de confirmação ao comprador.
- Página de erro amigável e reenvio de link caso o cliente perca.

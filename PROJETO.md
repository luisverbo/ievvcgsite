# 🎪 Spec de projeto — Festa das Nações 2026

## Como usar
Este arquivo é a especificação completa do projeto. `festa-das-nacoes.html` é a
PRÉVIA VISUAL JÁ APROVADA — fonte da verdade do design (cores, fontes, seções,
clima de pôster de show).

## 🧱 Stack

- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS (com os tokens de design abaixo)
- Supabase: Postgres (conteúdo), Auth (login do painel), Storage (fotos/vídeos)
- `@supabase/ssr` para auth server-side (atenção à interface de cookies — ver observações)
- Deploy na Vercel
- Fontes via `next/font/google`: Bricolage Grotesque (títulos) e Figtree (texto)

### Estrutura sugerida

```
/app
  /(site)/page.tsx          → landing pública (Server Component, lê do Supabase)
  /(site)/components/...     → uma pasta/componente por seção
  /admin/login/page.tsx      → tela de login
  /admin/page.tsx            → dashboard do painel (protegido)
  /admin/[secao]/...         → CRUD de cada seção
/lib/supabase/               → clients (browser, server) com @supabase/ssr
/middleware.ts               → protege /admin
```

## 🎨 Design system (copiar exatamente da prévia)

Objetivo visual: pôster de show / festa de rua noturna das nações. Não pode ter
cara de SaaS/sistema nem template genérico. Foco mobile-first.

### Cores (usar como CSS variables no Tailwind theme)

```
night     #1E0F26   (fundo principal)
night-2   #2A1732   (painéis)
night-3   #37203F
cream      #FBF1DF   (texto claro)
cream-dim  #D9C7C0   (texto secundário)
gold       #F4A62A   (destaque)
coral      #EF5B43   (ações/botões)
green      #37B08A
pink       #EA5C93
violet     #9D6BE0
```

### Tipografia

- Títulos: Bricolage Grotesque peso 800, letter-spacing -0.02em, line-height 0.98.
- Texto: Figtree (400/500/600/700).
- Nenhuma fonte monospace.

### Detalhes de assinatura (já estão na prévia, replicar)

- Fileira de luzes piscando no topo do hero (animação suave, respeitar `prefers-reduced-motion`).
- Bandeirinhas coloridas (bunting).
- Marquee dourado rolando com países.
- Textura de grão sutil sobre o fundo (SVG noise, opacity ~0.05).
- Animações de "revelar ao rolar" (IntersectionObserver / fade+translateY).
- Botões e badges em formato pílula (border-radius grande).

## 📄 Seções da landing (na ordem — todas na prévia)

1. Header fixo — logo "Festa das Nações" + botão "Ingresso · R$12,50".
2. Hero — badge "11ª edição"; título "FESTA DAS NAÇÕES"; subtítulo "6 continentes · 16 países · 2 dias"; caixa com 3 infos (17&18 jul / 18h—00h / R$12,50); player de vídeo logo abaixo do título; botões "Garantir ingresso" e "Ver line-up".
3. Marquee de países.
4. Sobre a festa — texto sobre unir a igreja, arrecadar fundos, propagar o evangelho.
5. LINE-UP (seção principal) — artistas empilhados um sobre o outro. Cada bloco: foto, vídeo (formato reels vertical, com play), nome, estilo/país, descrição. Mobile: foto em cima, texto embaixo; desktop: alterna lado a lado.
6. Programação — 2 cards (Dia 01 Sex 17 jul / Dia 02 Sáb 18 jul) com horários.
7. Comidas típicas — grade de cards (emoji + país + prato).
8. Destaques — 3 cards coloridos: Área Kids (verde), Bazar & Sorteios (rosa), Passaporte (dourado).
9. Local seguro — endereço + lista de segurança (saídas, seguranças, ambulância, 5.000 pessoas, estacionamento).
10. Galeria de edições anteriores.
11. Ingresso — contagem regressiva até 17/07/2026 18h + preço + botão "Comprar" + aviso crianças até 3 anos.
12. FAQ em acordeão.
13. Depoimento — "Quem vem, se apaixona…".
14. Patrocinadores — grade "Sua marca".
15. Footer — redes sociais + Secretaria (21) 98158-3331 / contato.festadasnacoes@gmail.com.
16. Botão flutuante de WhatsApp.

Todo o conteúdo textual e de mídia deve vir do Supabase (nada fixo no código).

## 🗄️ Banco de dados — SQL para rodar no Supabase

Peça ao Claude Code para gerar exatamente este schema. Rode o SQL manualmente
no SQL Editor do Supabase (evita o problema do MCP conectar na organização errada).

### Tabelas necessárias

- `config_evento` (linha única): titulo_hero, subtitulo_hero, video_hero_url, texto_sobre, data_evento (timestamptz), preco_ingresso, link_compra, endereco, telefone, email, instagram_url, facebook_url, site_url, whatsapp_numero.
- `artistas`: nome, estilo, pais, descricao, foto_url, video_url, ordem (int), ativo (bool).
- `programacao`: dia (text), horario (text), descricao (text), ordem (int).
- `comidas`: pais, prato, emoji, ordem (int).
- `galeria`: imagem_url, ordem (int).
- `faq`: pergunta, resposta, ordem (int).
- `patrocinadores`: nome, logo_url, link_url, ordem (int).

### Regras

- Todas com `id uuid default gen_random_uuid() primary key` e `created_at timestamptz default now()`.
- RLS ligado em todas: `SELECT` público (anon pode ler); `INSERT/UPDATE/DELETE` só para `authenticated`.
- Bucket de Storage público chamado `midias` para fotos e vídeos, com policy de upload só para autenticados.
- Gerar um seed com os dados iniciais da prévia (4 artistas, comidas, faq, programação).

## 🔐 Painel admin (/admin)

- Login com email/senha (Supabase Auth). Usuário admin criado manualmente no painel do Supabase (Authentication → Add user).
- `middleware.ts` protege todas as rotas `/admin` (redireciona para `/admin/login` se não autenticado).
- Menu lateral (abas no mobile) com CRUD de cada área:
  - **Geral**: editar hero (título, subtítulo, upload do vídeo), texto sobre, data do evento (alimenta o countdown), preço, link de compra, endereço, contatos, redes, WhatsApp.
  - **Line-up**: listar/adicionar/editar/excluir artistas, com upload de foto e vídeo, reordenar (campo ordem), ativar/inativar.
  - **Programação / Comidas / Galeria / FAQ / Patrocinadores**: CRUD + reordenar + uploads onde fizer sentido.
- Uploads vão para o bucket `midias`; salvar a URL pública na tabela.
- No line-up, aceitar tanto upload de arquivo quanto link do YouTube/Instagram no campo de vídeo (o mais leve para mobile).
- Feedback de sucesso/erro ao salvar. Painel também responsivo.
- Após salvar, a landing pública reflete a mudança (revalidar cache — usar `revalidatePath` ou tag de cache).

## ⚙️ Variáveis de ambiente (.env.local e Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   (só server-side, nunca expor no client)
```

## ⚠️ Observações importantes

- Use `@supabase/ssr` para auth; atenção à interface de cookies (`getAll`/`setAll`) para não cair no erro clássico de cookie mismatch em Server Components/Route Handlers.
- Landing pública em Server Components lendo direto do Supabase (rápido, bom pra SEO). Painel pode ser Client Components com o browser client.
- Mobile-first sempre: teste cada seção em ~390px de largura primeiro.
- Otimizar imagens com `next/image`. Vídeos: preferir embed (link) a arquivos pesados.
- Acessibilidade: foco visível no teclado, `alt` nas imagens, `prefers-reduced-motion` respeitado.
- Ao terminar cada etapa, fazer commit com mensagem clara antes de seguir para a próxima.

## 🚦 Ordem de execução sugerida (uma etapa por vez)

1. Scaffold Next.js + Tailwind + tokens de design + fontes.
2. Landing estática 100% fiel ao `festa-das-nacoes.html` (ainda com dados fixos).
3. SQL do Supabase (entregar para rodar) + clients `@supabase/ssr`.
4. Ligar a landing ao Supabase (dados dinâmicos).
5. Auth + middleware + tela de login.
6. Painel: CRUD Geral → Line-up → demais seções.
7. Uploads no Storage.
8. Revalidação de cache + deploy na Vercel.
9. Passe final de responsividade mobile e acessibilidade.

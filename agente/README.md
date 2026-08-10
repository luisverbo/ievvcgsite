# Agente local de prospecção

Roda **no seu computador**, não na Vercel. Ele abre um navegador de verdade
com o seu IP de casa, pesquisa as empresas e grava direto no seu Supabase —
depois é só abrir `/app/admin/prospeccao` no painel e a lista está lá.

Por que local: servidor de nuvem tem IP de datacenter, e o Google bloqueia
esses IPs quase de imediato. Do seu computador, a busca é indistinguível de
uma pesquisa comum.

## Instalação (uma vez só)

```bash
cd agente
npm install
npm run instalar-navegador
cp .env.example .env
```

Depois abra o `.env` e preencha os dois valores (estão no painel do Supabase,
em **Project Settings → API**):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

> A `service_role` dá acesso total ao banco. Ela fica só no seu computador —
> o `.env` está no `.gitignore` e nunca vai para o GitHub.

## Usando

```bash
npm run prospectar -- --nicho=dentista --local="Barra da Tijuca, RJ" --limite=20
```

Uma janela do navegador abre e você acompanha o trabalho. Ao final, as
empresas aparecem no painel já com a nota de potencial.

### Opções

| Opção | O que faz |
|---|---|
| `--nicho=` | obrigatório — veja a lista rodando sem argumentos |
| `--local=` | obrigatório — bairro e cidade, entre aspas |
| `--limite=` | quantas empresas buscar (padrão 20, máximo 120) |
| `--headless` | roda sem abrir janela |
| `--pausa=2500` | milissegundos entre uma empresa e outra (padrão 1800) |
| `--debug` | salva print e HTML em `diagnostico/` quando algo falha |

## Cuidados

- **Vá com calma.** Rodar centenas de buscas seguidas queima seu IP. Prefira
  lotes de 20 a 40 por vez, com intervalo entre eles. O `--pausa` existe para
  isso — aumente se começar a dar bloqueio.
- **O agente nunca burla proteção.** Se aparecer CAPTCHA, pedido de login ou
  aviso de tráfego incomum, ele avisa e para. Se isso acontecer, espere alguns
  minutos e tente de novo com um limite menor.
- **Raspar o Google Maps vai contra os termos de uso deles.** Não é crime, mas
  é violação contratual e o bloqueio é a consequência prática. A busca por
  OpenStreetMap, no painel, não tem essa restrição — use as duas conforme o
  caso.
- **Os seletores podem quebrar.** O Google muda o HTML sem aviso. Quando isso
  acontecer, rode com `--debug` e mande os arquivos de `diagnostico/` para
  corrigirmos.

## As duas buscas convivem

O painel grava com `fonte = 'osm'`, o agente com `fonte = 'google'`. A mesma
empresa pode aparecer nas duas — são registros distintos, e o que você marcou
no funil (contactado, fechou) nunca é sobrescrito ao refazer uma busca.

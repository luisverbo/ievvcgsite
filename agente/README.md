# Agente de prospecção

Busca empresas no Google Maps com um navegador de verdade e grava no seu
Supabase. O painel só **enfileira** a busca; quem executa é este agente.

```
[Painel]  → cria a tarefa
              ↓
        [Painel: fila da sua conta]
              ↑
[Agente]  → pega a tarefa → busca → grava → marca pronta
```

O agente **nunca recebe conexão de fora** — ele só pergunta ao painel se há
trabalho. Por isso o mesmo código roda na VPS ou no seu computador, sem abrir
porta, sem IP fixo e sem domínio.

Ele também **não tem acesso ao banco**: fala com o painel por HTTP, com um
token que vale só para a sua conta.

---

## Instalar na VPS (Ubuntu)

Requisitos: Ubuntu 22.04+, 2GB de RAM livres, acesso root.

```bash
# 1. Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git

# 2. O projeto
cd /opt
git clone https://github.com/luisverbo/ievvcgsite.git
cd ievvcgsite
git checkout claude/paginapro

# 3. O agente + navegador (o --with-deps instala as bibliotecas do sistema)
cd agente
npm install
npx playwright install --with-deps chromium

# 4. As credenciais
cp .env.example .env
nano .env      # cole PAGINAPRO_URL e PAGINAPRO_TOKEN
               # (painel → Prospecção › Meu agente)
```

Teste antes de deixar rodando sozinho:

```bash
npm run prospectar -- --nicho=dentista --local="Barra da Tijuca, RJ" --limite=5 --headless
```

Deu certo? Então deixe o serviço no ar permanentemente:

```bash
cat >/etc/systemd/system/paginapro-agente.service <<'UNIT'
[Unit]
Description=Agente de prospeccao do PaginaPro
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/ievvcgsite/agente
ExecStart=/usr/bin/npm run servico
Restart=always
RestartSec=15
User=root
# O agente fecha o navegador sozinho ao receber o SIGTERM. Estes dois
# garantem que, se algo travar, o systemd limpa o grupo inteiro em vez de
# deixar um Chromium orfao segurando a sessao do WhatsApp.
KillMode=control-group
TimeoutStopSec=25

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now paginapro-agente
systemctl status paginapro-agente        # deve aparecer "active (running)"
journalctl -u paginapro-agente -f        # acompanhar o que ele está fazendo
```

Pronto: o botão **Buscar no Google** do painel passa a funcionar, inclusive do
celular. Para atualizar depois:

```bash
cd /opt/ievvcgsite && git pull && systemctl restart paginapro-agente
```

O `git pull` **não encosta** no `.env` nem na pasta `.perfil-whatsapp` (as duas
ficam fora do repositório), então atualizar não custa a sessão do WhatsApp.

### Se depois de um restart ele pedir QR de novo

Sinal de que sobrou um processo antigo segurando a pasta do perfil — acontecia
antes do agente aprender a fechar o navegador no SIGTERM:

```bash
systemctl stop paginapro-agente
pkill -f "tsx servico.ts"; pkill -f chrome; pkill -f chromium
sleep 3
ps aux | grep -E "node|chrom" | grep -v grep   # tem que sair vazio
systemctl start paginapro-agente
```

---

## Rodar no seu computador

Mesmo código, sem systemd:

```bash
cd agente
npm install
npm run instalar-navegador
cp .env.example .env     # preencha
npm run servico
```

Enquanto essa janela estiver aberta, o botão do painel funciona. Para ver o
navegador trabalhando, coloque `AGENTE_HEADLESS=false` no `.env`.

> **Plano B:** se o Google começar a bloquear a VPS, pare o serviço lá
> (`systemctl stop paginapro-agente`) e rode `npm run servico` no seu
> computador. O painel continua igual — só mudou quem atende a fila.

---

## Busca avulsa pelo terminal

Sem passar pela fila, útil para testar:

```bash
npm run prospectar -- --nicho=dentista --local="Barra da Tijuca, RJ" --limite=10
```

| Opção | O que faz |
|---|---|
| `--nicho=` | obrigatório — rode sem argumentos para ver a lista |
| `--local=` | obrigatório — bairro e cidade, entre aspas |
| `--limite=` | quantas buscar (padrão 20, máximo 120) |
| `--headless` | sem abrir janela (obrigatório em VPS sem tela) |
| `--pausa=2500` | milissegundos entre empresas (padrão 1800) |
| `--debug` | salva print e HTML em `diagnostico/` quando falha |

## Variáveis do `.env`

| Variável | Para que serve |
|---|---|
| `PAGINAPRO_URL` | endereço do painel (ex.: https://seusite.com.br) |
| `PAGINAPRO_TOKEN` | o código do seu agente, criado no painel |
| `AGENTE_NOME` | nome que aparece no painel (padrão: hostname) |
| `AGENTE_PAUSA_MS` | pausa entre empresas (padrão 2500) |
| `AGENTE_INTERVALO_MS` | de quanto em quanto tempo checa a fila (padrão 8000) |
| `AGENTE_HEADLESS` | `false` mostra o navegador (padrão: oculto) |
| `INSTAGRAM_SESSIONID` | opcional — cookie de uma conta sua, para ler perfis (veja abaixo) |
| `INSTAGRAM_DS_USER_ID` | opcional — acompanha o cookie acima |

---

## Captura de Instagram

O agente lê a bio, o número de seguidores e as fotos do perfil da empresa, e
as fotos entram no site gerado. Sai muito melhor que imagem de IA: o cliente
reconhece a própria loja na tela.

**Ritmo.** Um perfil por vez, com 1,5 a 4 minutos de intervalo, no máximo 15
por dia. Não é exagero de cautela: o Instagram bloqueia por *rajada*. Dez
perfis em dois minutos derruba o acesso na hora; os mesmos dez espalhados no
dia passam sem problema. Levando bloqueio, o agente fica três horas sem tocar
em tarefa de Instagram — as buscas do Google seguem normalmente nesse tempo,
e as capturas ficam esperando na fila.

**Se vier "O Instagram exigiu login".** De conexão residencial a leitura
anônima costuma bastar. De VPS não: o IP é de datacenter e o Instagram
desconfia bem mais. Aí a saída é ler com uma conta sua:

```bash
# no Chrome, logado no Instagram com uma conta SECUNDÁRIA:
# F12 → Application → Cookies → https://www.instagram.com
# copie o valor de "sessionid" e o de "ds_user_id"

nano /opt/ievvcgsite/agente/.env
# INSTAGRAM_SESSIONID=...
# INSTAGRAM_DS_USER_ID=...

systemctl restart paginapro-agente
```

Só o cookie, nunca a senha. O cookie expira sozinho (semanas), e aí é só
repetir. Use uma conta secundária: a conta que lê perfis em ritmo de robô é a
que pode cair em verificação, e você não quer isso no seu perfil principal.

---

## Cuidados

- **Vá com calma.** Lotes de 20 a 40 por vez, com intervalo entre eles. IP de
  VPS é de datacenter, e o Google desconfia mais dele que de uma conexão
  residencial — se começar a bloquear, aumente `AGENTE_PAUSA_MS` e reduza o
  limite por busca.
- **O agente nunca burla proteção.** Ao ver CAPTCHA, pedido de login ou aviso
  de tráfego incomum, ele registra o motivo no painel, descansa e para. Se
  isso virar rotina, é sinal de que o volume está alto demais.
- **Raspar o Google Maps vai contra os termos de uso deles.** Não é crime, mas
  é violação contratual, e o bloqueio é a consequência prática. A busca por
  OpenStreetMap, no painel, não tem essa restrição.
- **Os seletores podem quebrar.** O Google muda o HTML sem aviso. Quando isso
  acontecer, rode com `--debug` e mande os arquivos de `diagnostico/`.

## As duas buscas convivem

O painel grava com `fonte = 'osm'`, o agente com `fonte = 'google'`. A mesma
empresa pode aparecer nas duas — são registros distintos, e o que você marcou
no funil (contactado, fechou) nunca é sobrescrito ao refazer uma busca.

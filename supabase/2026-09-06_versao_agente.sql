-- Versão e atualização do agente pelo painel.
--
-- O painel passa a saber qual versão cada agente está rodando (o agente
-- reporta a cada 5 minutos) e compara com a que ele tem para entregar. E o
-- botão Atualizar vira um pedido guardado aqui: na próxima checagem o agente
-- lê, puxa o código novo (git na VPS, download no zip) e reinicia sozinho.

alter table agentes
  -- Hash do conteúdo dos arquivos do agente (veja agente/versao.ts).
  add column if not exists versao text,
  add column if not exists versao_em timestamptz,
  -- O dono clicou em Atualizar. O agente limpa ao atender.
  add column if not exists atualizar_pedido boolean not null default false;

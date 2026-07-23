-- Métricas avançadas: evento de "saída" com scroll máximo, tempo na página
-- e tempo por zona (mapa de calor de rolagem).
-- Rode no SQL Editor do projeto "Criador de paginas".

alter table analytics_eventos drop constraint if exists analytics_eventos_tipo_check;
alter table analytics_eventos
  add constraint analytics_eventos_tipo_check
  check (tipo in ('pageview', 'click', 'saida'));

alter table analytics_eventos add column if not exists dados jsonb;

-- Adiciona flags para ocultar seções Depoimento e Patrocinadores na landing.
alter table config_evento
  add column if not exists ocultar_testemunho    boolean not null default false,
  add column if not exists ocultar_patrocinadores boolean not null default false;

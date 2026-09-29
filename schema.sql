CREATE TABLE IF NOT EXISTS sslogger_live (
  id            bigserial PRIMARY KEY,
  event_date    date NOT NULL,
  event_time    time NOT NULL,
  server        text NOT NULL,
  service_level text,
  tag           text,
  account       text,
  groep         text,
  alias         text,
  reden         text,
  owner         text,
  UNIQUE (event_date, event_time, server, account)
);

CREATE INDEX IF NOT EXISTS idx_sslogger_live_date ON sslogger_live (event_date);

CREATE TABLE IF NOT EXISTS sources (
    id           TEXT PRIMARY KEY,
    name         TEXT        NOT NULL,
    filename     TEXT        NOT NULL,
    extension    TEXT        NOT NULL,
    size         INTEGER     NOT NULL,
    content_hash TEXT        NOT NULL,
    content      TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS typing_runs (
    id               TEXT PRIMARY KEY,
    source_id        TEXT REFERENCES sources(id) ON DELETE SET NULL,
    started_at       TIMESTAMPTZ NOT NULL,
    duration_ms      INTEGER     NOT NULL,
    status           TEXT        NOT NULL,
    game_type        TEXT        NOT NULL,
    configuration    JSONB       NOT NULL DEFAULT '{}',
    target           TEXT        NOT NULL,
    events           JSONB       NOT NULL DEFAULT '[]',
    raw_metrics      JSONB       NOT NULL DEFAULT '{}',
    effective_metrics JSONB      NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

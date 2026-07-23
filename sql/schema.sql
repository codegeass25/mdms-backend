-- ============================================================
-- MDMS — Supabase schema (single-row JSONB storage)
-- Run once in the Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_state (
    id          TEXT PRIMARY KEY,
    data        JSONB       NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_state_history (
    id          BIGSERIAL PRIMARY KEY,
    state_id    TEXT        NOT NULL,
    data        JSONB       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_state_history_state_id_created_at
    ON public.app_state_history (state_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.app_state_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_state_touch_updated_at ON public.app_state;
CREATE TRIGGER trg_app_state_touch_updated_at
    BEFORE UPDATE ON public.app_state
    FOR EACH ROW EXECUTE FUNCTION public.app_state_touch_updated_at();

-- Service role bypasses RLS. Enable RLS as a safety net so anon/authenticated
-- keys cannot reach the row by accident.
ALTER TABLE public.app_state         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state_history ENABLE ROW LEVEL SECURITY;

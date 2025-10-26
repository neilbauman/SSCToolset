-- ===================================================================
-- Migration: Derived Dataset RPCs (Phase 1)
-- Timestamp: 2025-10-27T15:00
-- Author: SSC Toolset / ChatGPT-Architect
-- -------------------------------------------------------------------
-- Purpose:
--   This migration locks in the two verified RPCs that power the
--   Derived Dataset Wizard and Derived Datasets page:
--     • simulate_join_preview_autoaggregate()
--     • create_derived_dataset()
--
--   Future schema updates (tables, views, recompute functions) will
--   be added in later migrations.
-- -------------------------------------------------------------------
-- Safe to re-run: Yes (uses DROP IF EXISTS)
-- Dependencies: Requires the existing derived_dataset_metadata table.
-- ===================================================================

-- -------------------------------------------------------------------
-- 1. RPC: simulate_join_preview_autoaggregate
-- -------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.simulate_join_preview_autoaggregate(
  text, text, text, text, text, text, text, boolean, numeric
);

CREATE OR REPLACE FUNCTION public.simulate_join_preview_autoaggregate(
  p_table_a TEXT,
  p_table_b TEXT,
  p_country TEXT,
  p_target_level TEXT,
  p_method TEXT,
  p_col_a TEXT,
  p_col_b TEXT,
  p_use_scalar_b BOOLEAN,
  p_scalar_b_val NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  join_key TEXT,
  a NUMERIC,
  b NUMERIC,
  derived NUMERIC,
  col_a_used TEXT,
  col_b_used TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  sql TEXT;
  expr_b TEXT;
  join_clause TEXT := '';
  join_key TEXT;
BEGIN
  -- Auto-detect a shared join key (common column ending in pcode or code)
  SELECT c1.column_name
  INTO join_key
  FROM information_schema.columns c1
  JOIN information_schema.columns c2
    ON c1.column_name = c2.column_name
  WHERE c1.table_name = p_table_a
    AND c2.table_name = p_table_b
    AND (c1.column_name ILIKE '%pcode%' OR c1.column_name ILIKE '%code%')
  LIMIT 1;

  IF join_key IS NULL THEN
    RAISE EXCEPTION 'Could not find a common join column between % and %',
      p_table_a, p_table_b;
  END IF;

  -- Expression for “b”
  IF p_use_scalar_b THEN
    expr_b := COALESCE(p_scalar_b_val::text, '0');
  ELSE
    expr_b := format('CAST(b.%I AS numeric)', p_col_b);
  END IF;

  -- Join clause
  IF NOT p_use_scalar_b AND p_table_b IS NOT NULL THEN
    join_clause := format('JOIN %I b ON a.%I = b.%I', p_table_b, join_key, join_key);
  END IF;

  -- Build SQL dynamically with safe type casts
  sql := format(
    'SELECT a.%1$I AS join_key,
            CAST(a.%2$I AS numeric) AS a,
            %3$s AS b,
            CASE
              WHEN %4$L = ''ratio'' THEN CAST(a.%2$I AS numeric) / NULLIF(%3$s,0)
              WHEN %4$L = ''multiply'' THEN CAST(a.%2$I AS numeric) * %3$s
              WHEN %4$L = ''sum'' THEN CAST(a.%2$I AS numeric) + %3$s
              WHEN %4$L = ''difference'' THEN CAST(a.%2$I AS numeric) - %3$s
              ELSE NULL
            END AS derived,
            %2$L AS col_a_used,
            %5$L AS col_b_used
     FROM %6$I a %7$s',
     join_key,         -- 1
     p_col_a,          -- 2
     expr_b,           -- 3
     p_method,         -- 4
     p_col_b,          -- 5
     p_table_a,        -- 6
     join_clause       -- 7
  );

  RETURN QUERY EXECUTE sql;
END;
$$;

COMMENT ON FUNCTION public.simulate_join_preview_autoaggregate(
  text, text, text, text, text, text, text, boolean, numeric
)
IS 'Simulates joining two datasets (or one dataset + scalar) to preview derived values before saving. Used by Derived Dataset Wizard.';

-- -------------------------------------------------------------------
-- 2. RPC: create_derived_dataset
-- -------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_derived_dataset(
  text, text, text, text, text, boolean, numeric, text, text, text, text, text, text, text, boolean
);

CREATE OR REPLACE FUNCTION public.create_derived_dataset(
  p_country TEXT,
  p_title TEXT,
  p_description TEXT,
  p_admin_level TEXT,
  p_method TEXT,
  p_use_scalar_b BOOLEAN,
  p_scalar_b_val NUMERIC,
  p_table_a TEXT,
  p_table_b TEXT,
  p_col_a TEXT,
  p_col_b TEXT,
  p_formula TEXT,
  p_source_level TEXT,
  p_target_level TEXT,
  p_dynamic_resolution BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.derived_dataset_metadata (
    id, country_iso, title, description, admin_level, method,
    use_scalar_b, scalar_b_val, table_a, table_b,
    col_a, col_b, formula, source_level, target_level,
    dynamic_resolution, created_at
  )
  VALUES (
    new_id, p_country, p_title, p_description, p_admin_level, p_method,
    p_use_scalar_b, p_scalar_b_val, p_table_a, p_table_b,
    p_col_a, p_col_b, p_formula, p_source_level, p_target_level,
    p_dynamic_resolution, now()
  );

  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.create_derived_dataset(
  text, text, text, text, text, boolean, numeric, text, text, text, text, text, text, text, boolean
)
IS 'Registers a new derived dataset in derived_dataset_metadata. Used by the Derived Dataset Wizard Save step.';

-- -------------------------------------------------------------------
-- End of Migration
-- -------------------------------------------------------------------

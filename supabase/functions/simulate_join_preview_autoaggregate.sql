-- Drop old versions
DROP FUNCTION IF EXISTS public.simulate_join_preview_autoaggregate(
  text, text, text, text, text, text, text, boolean, numeric
);

CREATE OR REPLACE FUNCTION public.simulate_join_preview_autoaggregate(
  p_table_a TEXT,           -- e.g. population_data
  p_table_b TEXT,           -- e.g. gis_features
  p_country TEXT,           -- 'PHL'
  p_target_level TEXT,      -- 'ADM4'
  p_method TEXT,            -- 'ratio', 'multiply', etc.
  p_col_a TEXT,             -- e.g. 'population'
  p_col_b TEXT,             -- e.g. 'area_sqkm'
  p_use_scalar_b BOOLEAN,   -- if true, scalar instead of dataset B
  p_scalar_b_val NUMERIC    -- numeric scalar
)
RETURNS TABLE (
  join_key TEXT,
  place_name TEXT,
  admin_level TEXT,
  a NUMERIC,
  b NUMERIC,
  derived NUMERIC,
  join_status TEXT,
  col_a_used TEXT,
  col_b_used TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  dyn_sql TEXT;
BEGIN
  dyn_sql := format($f$
    SELECT
      a.pcode AS join_key,
      a.name AS place_name,
      COALESCE(a.admin_level, 'UNKNOWN') AS admin_level,
      a.%I::numeric AS a,
      %s AS b,
      CASE
        WHEN %L = 'ratio' THEN a.%I::numeric / NULLIF(%s,0)
        WHEN %L = 'multiply' THEN a.%I::numeric * %s
        WHEN %L = 'sum' THEN a.%I::numeric + %s
        WHEN %L = 'difference' THEN a.%I::numeric - %s
        ELSE NULL
      END AS derived,
      CASE WHEN b.%I IS NULL THEN 'missing_gis' ELSE 'matched' END AS join_status,
      %L AS col_a_used,
      %L AS col_b_used
    FROM %I a
    LEFT JOIN %I b
      ON a.pcode = b.pcode
      AND a.country_iso = b.country_iso
    WHERE a.country_iso = %L
      AND a.admin_level = %L
  $f$,
    p_col_a,
    CASE WHEN p_use_scalar_b THEN p_scalar_b_val::text ELSE format('b.%I::numeric', p_col_b) END,
    p_method, p_col_a,
    CASE WHEN p_use_scalar_b THEN p_scalar_b_val::text ELSE format('b.%I::numeric', p_col_b) END,
    p_method, p_col_a,
    CASE WHEN p_use_scalar_b THEN p_scalar_b_val::text ELSE format('b.%I::numeric', p_col_b) END,
    p_method, p_col_a,
    CASE WHEN p_use_scalar_b THEN p_scalar_b_val::text ELSE format('b.%I::numeric', p_col_b) END,
    p_col_b,
    p_col_a, p_col_b,
    p_table_a, COALESCE(p_table_b, p_table_a),
    p_country, p_target_level
  );

  RETURN QUERY EXECUTE dyn_sql;
END;
$$;

-- Drop old version to avoid signature conflict
DROP FUNCTION IF EXISTS public.simulate_join_preview_autoaggregate(
  text,text,text,text,text,text,text,boolean,numeric
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
  p_scalar_b_val NUMERIC
)
RETURNS TABLE (
  join_key TEXT,
  place_name TEXT,
  a NUMERIC,
  b NUMERIC,
  derived NUMERIC,
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
      COALESCE(a.place_name, b.place_name) AS place_name,
      a.%I::numeric AS a,
      %s AS b,
      CASE
        WHEN %L = 'ratio' THEN a.%I::numeric / NULLIF(%s, 0)
        WHEN %L = 'multiply' THEN a.%I::numeric * %s
        WHEN %L = 'sum' THEN a.%I::numeric + %s
        WHEN %L = 'difference' THEN a.%I::numeric - %s
        ELSE NULL
      END AS derived,
      %L AS col_a_used,
      %L AS col_b_used
    FROM %I a
    LEFT JOIN %I b
      ON a.pcode = b.pcode
  $f$,
    p_col_a,
    CASE WHEN p_use_scalar_b THEN p_scalar_b_val::text ELSE format('b.%I::numeric', p_col_b) END,
    p_method, p_col_a,
    CASE WHEN p_use_scalar_b THEN p_scalar_b_val::text ELSE format('b.%I::numeric', p_col_b) END,
    p_method, p_col_a,
    CASE WHEN p_use_scalar_b THEN p_scalar_b_val::text ELSE format('b.%I::numeric', p_col_b) END,
    p_method, p_col_a,
    CASE WHEN p_use_scalar_b THEN p_scalar_b_val::text ELSE format('b.%I::numeric', p_col_b) END,
    p_col_a, p_col_b,
    p_table_a, COALESCE(p_table_b, p_table_a)
  );

  RETURN QUERY EXECUTE dyn_sql;
END;
$$;

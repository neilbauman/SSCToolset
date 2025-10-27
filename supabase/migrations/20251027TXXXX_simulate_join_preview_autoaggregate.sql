-- Migration: create or replace simulate_join_preview_autoaggregate()
-- Author: SSC Toolset
-- Date: 2025-10-27

-- 1️⃣ Drop any old versions
DROP FUNCTION IF EXISTS simulate_join_preview_autoaggregate(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  numeric
);

-- 2️⃣ Create the current production version
CREATE OR REPLACE FUNCTION simulate_join_preview_autoaggregate(
  p_table_a TEXT,
  p_table_b TEXT DEFAULT NULL,
  p_country_iso TEXT DEFAULT 'PHL',
  p_target_level TEXT DEFAULT 'ADM3',
  p_method TEXT DEFAULT 'ratio',
  p_col_a TEXT DEFAULT 'population',
  p_col_b TEXT DEFAULT 'area_sqkm',
  p_use_scalar_b BOOLEAN DEFAULT FALSE,
  p_scalar_b_val NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  join_key TEXT,
  place_name TEXT,
  a NUMERIC,
  b NUMERIC,
  derived NUMERIC,
  col_a_used TEXT,
  col_b_used TEXT,
  join_status TEXT,
  source_level_a TEXT,
  source_level_b TEXT,
  target_level TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  src_level_a TEXT;
  src_level_b TEXT;
  sql TEXT;
BEGIN
  --------------------------------------------------------------------
  -- Detect administrative level of Dataset A and Dataset B
  --------------------------------------------------------------------
  EXECUTE format(
    'SELECT CASE
       WHEN EXISTS (SELECT 1 FROM %I WHERE LENGTH(pcode)=11) THEN ''ADM4''
       WHEN EXISTS (SELECT 1 FROM %I WHERE LENGTH(pcode)=9) THEN ''ADM3''
       WHEN EXISTS (SELECT 1 FROM %I WHERE LENGTH(pcode)=7) THEN ''ADM2''
       WHEN EXISTS (SELECT 1 FROM %I WHERE LENGTH(pcode)=5) THEN ''ADM1''
       ELSE ''UNKNOWN'' END',
    p_table_a, p_table_a, p_table_a, p_table_a
  ) INTO src_level_a;

  IF p_use_scalar_b IS FALSE AND p_table_b IS NOT NULL THEN
    EXECUTE format(
      'SELECT CASE
         WHEN EXISTS (SELECT 1 FROM %I WHERE LENGTH(pcode)=11) THEN ''ADM4''
         WHEN EXISTS (SELECT 1 FROM %I WHERE LENGTH(pcode)=9) THEN ''ADM3''
         WHEN EXISTS (SELECT 1 FROM %I WHERE LENGTH(pcode)=7) THEN ''ADM2''
         WHEN EXISTS (SELECT 1 FROM %I WHERE LENGTH(pcode)=5) THEN ''ADM1''
         ELSE ''UNKNOWN'' END',
      p_table_b, p_table_b, p_table_b, p_table_b
    ) INTO src_level_b;
  ELSE
    src_level_b := 'scalar';
  END IF;

  IF p_target_level IS NULL THEN
    p_target_level := src_level_a;
  END IF;

  --------------------------------------------------------------------
  -- Dynamic SQL build for scalar or table joins
  --------------------------------------------------------------------
  IF p_use_scalar_b THEN
    -- SCALAR B MODE
    sql := format($f$
      WITH a_raw AS (
        SELECT pcode, %I::double precision AS a_val
        FROM %I
        WHERE country_iso = %L
      ),
      a_rollup AS (
        SELECT
          CASE %L
            WHEN 'ADM1' THEN substring(pcode,1,4)||'00000000'
            WHEN 'ADM2' THEN substring(pcode,1,6)||'00000'
            WHEN 'ADM3' THEN substring(pcode,1,8)||'000'
            WHEN 'ADM4' THEN pcode
          END AS k,
          SUM(a_val) AS a
        FROM a_raw
        GROUP BY 1
      )
      SELECT
        a_rollup.k AS join_key,
        g.name AS place_name,
        a_rollup.a::numeric AS a,
        %s::numeric AS b,
        ROUND(
          CASE %L
            WHEN 'ratio' THEN a_rollup.a / NULLIF(%s,0)
            WHEN 'multiply' THEN a_rollup.a * %s
            WHEN 'sum' THEN a_rollup.a + %s
            WHEN 'difference' THEN a_rollup.a - %s
            ELSE NULL
          END::numeric, 6
        ) AS derived,
        %L AS col_a_used,
        'scalar_b' AS col_b_used,
        CASE WHEN g.name IS NULL THEN 'missing_admin' ELSE 'ok' END AS join_status,
        %L AS source_level_a,
        %L AS source_level_b,
        %L AS target_level
      FROM a_rollup
      LEFT JOIN gis_features g ON g.pcode = a_rollup.k
      WHERE g.admin_level = %L

      UNION ALL
      SELECT
        'SUMMARY',
        NULL,
        COUNT(*) FILTER (WHERE g.name IS NOT NULL)::numeric,
        COUNT(*) FILTER (WHERE g.name IS NULL)::numeric,
        ROUND(
          (COUNT(*) FILTER (WHERE g.name IS NOT NULL)::numeric / NULLIF(COUNT(*),0)) * 100,
          1
        ),
        'joined_ok',
        'missing',
        'summary',
        %L, %L, %L
      FROM a_rollup
      LEFT JOIN gis_features g ON g.pcode = a_rollup.k
      WHERE g.admin_level = %L
      ORDER BY join_key
    $f$,
      p_col_a, p_table_a, p_country_iso,
      p_target_level,
      COALESCE(p_scalar_b_val,0),
      p_method,
      COALESCE(p_scalar_b_val,0),
      COALESCE(p_scalar_b_val,0),
      COALESCE(p_scalar_b_val,0),
      COALESCE(p_scalar_b_val,0),
      p_col_a,
      src_level_a,
      src_level_b,
      p_target_level,
      p_target_level,
      src_level_a,
      src_level_b,
      p_target_level,
      p_target_level
    );

  ELSE
    -- NORMAL JOIN MODE
    sql := format($f$
      WITH a_raw AS (
        SELECT pcode, %I::double precision AS a_val
        FROM %I
        WHERE country_iso = %L
      ),
      b_raw AS (
        SELECT pcode, %I::double precision AS b_val
        FROM %I
        WHERE country_iso = %L
      ),
      a_rollup AS (
        SELECT
          CASE %L
            WHEN 'ADM1' THEN substring(pcode,1,4)||'00000000'
            WHEN 'ADM2' THEN substring(pcode,1,6)||'00000'
            WHEN 'ADM3' THEN substring(pcode,1,8)||'000'
            WHEN 'ADM4' THEN pcode
          END AS k,
          SUM(a_val) AS a
        FROM a_raw
        GROUP BY 1
      ),
      b_rollup AS (
        SELECT
          CASE %L
            WHEN 'ADM1' THEN substring(pcode,1,4)||'00000000'
            WHEN 'ADM2' THEN substring(pcode,1,6)||'00000'
            WHEN 'ADM3' THEN substring(pcode,1,8)||'000'
            WHEN 'ADM4' THEN pcode
          END AS k,
          SUM(b_val) AS b
        FROM b_raw
        GROUP BY 1
      ),
      joined AS (
        SELECT
          COALESCE(a_rollup.k,b_rollup.k) AS join_key,
          a_rollup.a,
          b_rollup.b
        FROM a_rollup
        FULL JOIN b_rollup ON a_rollup.k = b_rollup.k
      )
      SELECT
        j.join_key,
        g.name AS place_name,
        j.a::numeric,
        j.b::numeric,
        ROUND(
          CASE %L
            WHEN 'ratio' THEN j.a / NULLIF(j.b,0)
            WHEN 'multiply' THEN j.a * j.b
            WHEN 'sum' THEN j.a + j.b
            WHEN 'difference' THEN j.a - j.b
            ELSE NULL
          END::numeric, 6
        ) AS derived,
        %L AS col_a_used,
        %L AS col_b_used,
        CASE
          WHEN j.a IS NULL OR j.b IS NULL THEN 'partial_join'
          ELSE 'ok'
        END AS join_status,
        %L AS source_level_a,
        %L AS source_level_b,
        %L AS target_level
      FROM joined j
      LEFT JOIN gis_features g ON g.pcode = j.join_key
      WHERE g.admin_level = %L

      UNION ALL
      SELECT
        'SUMMARY',
        NULL,
        COUNT(*) FILTER (WHERE j.a IS NOT NULL AND j.b IS NOT NULL)::numeric,
        COUNT(*) FILTER (WHERE j.a IS NULL OR j.b IS NULL)::numeric,
        ROUND(
          (COUNT(*) FILTER (WHERE j.a IS NOT NULL AND j.b IS NOT NULL)::numeric / NULLIF(COUNT(*),0)) * 100,
          1
        ),
        'joined_ok',
        'missing',
        'summary',
        %L, %L, %L
      FROM joined j
      LEFT JOIN gis_features g ON g.pcode = j.join_key
      WHERE g.admin_level = %L
      ORDER BY join_key
    $f$,
      p_col_a, p_table_a, p_country_iso,
      p_col_b, p_table_b, p_country_iso,
      p_target_level,
      p_target_level,
      p_method,
      p_col_a,
      p_col_b,
      src_level_a,
      src_level_b,
      p_target_level,
      p_target_level,
      src_level_a,
      src_level_b,
      p_target_level,
      p_target_level
    );
  END IF;

  RETURN QUERY EXECUTE sql;
END;
$$;

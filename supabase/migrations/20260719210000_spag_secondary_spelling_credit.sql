-- Grammar/SPaG practice also credits Spelling (11+ SPaG is one bank section).
-- Keep in sync with src/lib/canonicalTopics.ts SECONDARY_ALIAS_MAP.

CREATE OR REPLACE FUNCTION public.canonicalize_readiness_topic_secondary(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(trim(COALESCE(raw, ''))) IN ('algebra & ratio', 'algebra and ratio')
      THEN 'Ratio & Proportion'
    WHEN lower(trim(COALESCE(raw, ''))) IN ('statistics & data', 'statistics and data')
      THEN 'Probability'
    WHEN lower(trim(COALESCE(raw, ''))) IN (
      'grammar', 'spag', 'spag (technical accuracy)', 'grammar & syntax'
    ) THEN 'Spelling'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.canonicalize_readiness_topic_secondary(text) IS
  'Secondary credit for combined 11+ sections. Mirror: src/lib/canonicalTopics.ts';

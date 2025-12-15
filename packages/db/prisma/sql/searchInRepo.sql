-- Find similar chunks within a specific repository
SELECT 
  c.id,
  c."repoId",
  r.name as "repoName",
  c."filePath",
  c."startLine",
  c."endLine",
  c.language,
  c.text,
  (c.embedding <=> $1) as distance
FROM chunks c
JOIN repos r ON c."repoId" = r.id
WHERE c.embedding IS NOT NULL
  AND c."repoId" = $2
ORDER BY distance
LIMIT $3;

-- Find similar chunks using cosine distance
-- @param $1:vector Query embedding vector
-- @param $2 Maximum number of results
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
ORDER BY c.embedding <=> $1
LIMIT $2;

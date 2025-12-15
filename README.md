# RepoAiChatSlop

RAG system for querying codebases using semantic search and LLM-powered Q&A.

## AI Usage
Chatgpt was heavily used to inform me on how to use OpenAi API and how its reponses and vectors work in practice, like using pgvector and how to set it up so stuff related to that was also written by Claude

## Architecture

- **Stack**: Next.js 16.0.8 App Router, React 19.2.1, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL with pgvector for embeddings
- **AI**: OpenAI GPT-4o-mini + text-embedding-3-small
- **Monorepo**: pnpm workspaces

### Package Structure

```
apps/
  web/              # Next.js frontend + API routes
packages/
  core/             # RAG pipeline, ingestion, evaluation
  db/               # Prisma schema, migrations, client
```

## Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for PostgreSQL)
- OpenAI API key

### Installation

1. Clone and install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and DATABASE_URL
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Run migrations:

```bash
pnpm --filter @repo-slop/db migrate:deploy
```

5. Ingest a repository:

```bash
pnpm ingest /path/to/repo "Project Name"
```

6. Start development server:

```bash
pnpm dev
```

Visit http://localhost:3000

## Features

### Core RAG Pipeline

- Smart code chunking (function-level, with overlap)
- Vector embeddings with pgvector
- Semantic search with relevance scoring
- Streaming LLM responses with sources
- File pattern filtering (`packages/core/**`, `*.ts`)

### Production Features

- **Multi-Repository Support**: Query single repository or search across all repositories
- **Analytics Dashboard**: Query history, latency, token usage tracking
- **Admin Panel**: Repository management, chunk statistics, delete repos
- **Bookmarks**: Save important Q&A interactions
- **Metrics**: Performance visualization with charts
- **Error Handling**: React error boundaries, toast notifications
- **Rate Limiting**: Configurable request throttling
- **Input Validation**: Question length and format checks

### Quality Metrics

- 10 evaluation test cases covering architecture, implementation, API, and data flow
- Automated evaluation system with LLM judge
- Evaluation results stored in database for tracking

## CLI Commands

```bash
# Ingest single repository
pnpm ingest /path/to/repo "Repository Name"

# Batch ingest multiple repositories
pnpm ingest:batch /path/to/parent-dir

# Run evaluation suite
pnpm eval

# Database management
pnpm --filter @repo-slop/db studio
pnpm --filter @repo-slop/db migrate:dev

# Development
pnpm dev        # Start web app
pnpm build      # Production build
pnpm lint       # ESLint
pnpm typecheck  # TypeScript validation
```

## API Endpoints

- `POST /api/ask` - Stream Q&A responses (SSE)
- `GET /api/history` - Get interaction history

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/repo_slop

# Optional (defaults shown)
NODE_ENV=development
```

## Project Structure

```
apps/web/
  app/
    api/              # API routes
    (analytics|admin|bookmarks|metrics)/  # Feature pages
  components/         # React components
  lib/                # Utilities (rate-limit, utils)

packages/core/src/
  ingest/             # File walking, chunking, indexing
  rag/                # Vector search, QA pipeline
  evaluation/         # Test cases, LLM judge
  providers/          # OpenAI client
  scripts/            # Dev/test scripts

packages/db/
  prisma/
    schema.prisma     # Database schema
    migrations/       # SQL migrations
  src/                # Prisma client exports
```

## Database Schema

- **repos**: Repository metadata (name, path, timestamps)
- **chunks**: Code/doc chunks with embeddings (1536-dim vectors)
- **interactions**: Q&A history with token usage
- **interaction_sources**: Chunk citations per answer
- **feedback**: Thumbs up/down ratings with optional comments
- **eval_cases**: Test cases for evaluation
- **eval_runs**: Evaluation results with scores
- **bookmarks**: Saved interactions

## Performance

- **Vector Index**: IVFFlat with cosine similarity on pgvector
- **Chunk Size**: 80-120 lines (code), configurable overlap
- **Top-K**: 8 chunks per query (configurable)
- **Embedding Batch**: 50 chunks per API call
- **Streaming**: SSE for real-time response delivery

## Development

### Adding New Features

1. Core logic → `packages/core/src/`
2. API routes → `apps/web/app/api/`
3. UI components → `apps/web/components/`
4. Database changes → `packages/db/prisma/schema.prisma` + migrate

### Testing

- Manual: `packages/core/scripts/test-*.ts`
- Evaluation: `pnpm eval`
- Browser: Playwright MCP for E2E

## Deployment

1. Set production environment variables
2. Build: `pnpm build`
3. Deploy database (managed PostgreSQL with pgvector)
4. Deploy Next.js app (Vercel, Railway, etc.)
5. Run migrations: `pnpm --filter @repo-slop/db migrate:deploy`

## License

MIT

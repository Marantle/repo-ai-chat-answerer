# RepoAiChatSlop

RAG system for querying codebases using semantic search and LLM-powered Q&A.

## Purpose of this app
This is a hobby project that I made to get familiar with how LLM AI's work, inspiration for this was to be learn to be something more than just  a prompt engineer that talks to AI agent and asks them to do slop, and then writing to their CV that their role is "AI Lead" or a "Professional AI Developer", ie. Prompt Engineer

## AI Usage
That said, I was also a bit of a Prompt Engineer with this one, as Chatgpt was heavily used to inform me on how to use OpenAi API and how its reponses and vectors work in practice, like using pgvector and how to set it up so stuff related to that was also written by Claude
Also logging, lots of it was injected by Claude to debug some issues

## Demo

### Frontend in Action
![Demo Video](demo.mov)

*Watch the full demo to see the chat interface, semantic search, bookmarks, analytics dashboard, and admin panel in action.*

### Ingestion Process
![Ingestion Example](ingest_example.png)

*Example output from the batch ingestion CLI showing repository scanning, chunking, embedding generation, and database storage.*

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

## How It Works

### Vector Embeddings & Semantic Search

The system uses OpenAI's **text-embedding-3-small** model to convert code and documentation into 1536-dimensional vectors. Each code chunk is embedded and stored in PostgreSQL with the **pgvector** extension, enabling semantic similarity search using cosine distance.

**The RAG Pipeline:**

1. **Ingestion**: Code is chunked into semantic units (functions, classes, doc blocks) with 10-line overlap
2. **Embedding**: Each chunk is converted to a vector via OpenAI's embedding API (batched in groups of 50)
3. **Storage**: Vectors are stored in PostgreSQL with **IVFFlat** indexing for fast approximate nearest neighbor search
4. **Query**: User questions are embedded using the same model
5. **Retrieval**: Vector similarity search finds the top 8 most relevant chunks (configurable)
6. **Generation**: Retrieved context is injected into GPT-4o-mini's prompt, which streams a response via SSE

**Why pgvector?**
- Stores embeddings directly in PostgreSQL (no separate vector DB needed)
- Supports cosine similarity, L2 distance, and inner product
- IVFFlat index provides ~10x faster search than sequential scan
- Native integration with Prisma ORM

**Vector Storage:**
- Each embedding is stored as a **`vector(1536)`** column in the `chunks` table
- Vectors are stored as fixed-size arrays in PostgreSQL (not serialized JSON)
- IVFFlat index created with: `CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`
- Query uses native SQL: `SELECT * FROM chunks ORDER BY embedding <=> $1 LIMIT 8`

**API Calls Per Chat:**
- **2 OpenAI API calls** per user question:
  1. **Embedding API** (text-embedding-3-small): Convert question to vector
  2. **Chat API** (gpt-4o-mini): Generate answer with retrieved context
- **No embedding calls** during chat (only at ingestion time)


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

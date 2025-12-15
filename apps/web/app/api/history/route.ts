/**
 * GET /api/history
 * Retrieve past conversations with optional filtering.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma, Prisma } from '@repo-slop/db'

interface QueryParams {
  limit: number
  offset: number
  repoId: string | null
}

function parseQueryParams(searchParams: URLSearchParams): QueryParams {
  return {
    limit: parseInt(searchParams.get('limit') ?? '50', 10),
    offset: parseInt(searchParams.get('offset') ?? '0', 10),
    repoId: searchParams.get('repoId'),
  }
}

function buildWhereClause(repoId: string | null): Prisma.InteractionWhereInput | undefined {
  return repoId
    ? {
        sources: {
          some: {
            chunk: {
              repoId,
            },
          },
        },
      }
    : undefined
}

async function fetchInteractions(
  params: QueryParams,
  where: Prisma.InteractionWhereInput | undefined
) {
  return prisma.interaction.findMany({
    where,
    take: params.limit,
    skip: params.offset,
    orderBy: { createdAt: 'desc' },
    include: {
      sources: {
        include: {
          chunk: {
            select: {
              id: true,
              filePath: true,
              startLine: true,
              endLine: true,
              language: true,
              repoId: true,
            },
          },
        },
        orderBy: { score: 'desc' },
      },
      feedback: true,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const params = parseQueryParams(request.nextUrl.searchParams)
    const where = buildWhereClause(params.repoId)
    const interactions = await fetchInteractions(params, where)
    const total = await prisma.interaction.count({ where })

    return NextResponse.json({
      interactions,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total,
        hasMore: params.offset + params.limit < total,
      },
    })
  } catch (error) {
    console.error('Error in /api/history:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

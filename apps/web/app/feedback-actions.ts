'use server'

import { prisma } from '@repo-slop/db'
import { revalidateTag } from 'next/cache'

export async function submitFeedback(interactionId: string, rating: 'UP' | 'DOWN') {
  try {
    await prisma.feedback.create({
      data: {
        interactionId,
        rating,
      },
    })

    revalidateTag('analytics', 'max')
    revalidateTag('interactions', 'max')

    return { success: true }
  } catch (error) {
    console.error('Failed to submit feedback:', error)
    return { success: false, error: 'Failed to submit feedback' }
  }
}

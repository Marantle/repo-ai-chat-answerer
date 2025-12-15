import { useState } from 'react'
import { toast } from 'sonner'
import { submitFeedback as submitFeedbackAction } from '@/app/feedback-actions'

export function useFeedback() {
  const [feedback, setFeedback] = useState<Record<string, 'UP' | 'DOWN'>>({})

  const submitFeedback = async (interactionId: string, rating: 'UP' | 'DOWN') => {
    setFeedback((prev) => ({ ...prev, [interactionId]: rating }))

    const result = await submitFeedbackAction(interactionId, rating)

    if (result.success) {
      toast.success(`Feedback submitted: ${rating === 'UP' ? '👍' : '👎'}`)
    } else {
      toast.error(result.error || 'Failed to submit feedback')
      setFeedback((prev) => {
        const next = { ...prev }
        delete next[interactionId]
        return next
      })
    }
  }

  return { feedback, submitFeedback }
}

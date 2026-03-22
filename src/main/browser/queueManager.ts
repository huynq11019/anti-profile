export type QueueTaskResult<T> = {
  item: T
  success: boolean
  error?: string
}

export async function runWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = 3
): Promise<QueueTaskResult<T>[]> {
  if (items.length === 0) return []

  const safeConcurrency = Math.max(1, Math.min(concurrency, 10))
  const queue = [...items]
  const results: QueueTaskResult<T>[] = []

  const runWorker = async () => {
    while (queue.length > 0) {
      const item = queue.shift() as T

      try {
        await worker(item)
        results.push({ item, success: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        results.push({ item, success: false, error: message })
      }
    }
  }

  const workers = Array.from({ length: Math.min(safeConcurrency, items.length) }, () => runWorker())
  await Promise.all(workers)
  return results
}

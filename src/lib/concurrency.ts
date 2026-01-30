/**
 * Simple concurrency limiter for parallel async operations.
 * Limits the number of promises running at once to prevent resource exhaustion.
 */

/**
 * Run async functions with limited concurrency.
 * Similar to p-limit but without the npm dependency.
 *
 * @param tasks - Array of async functions to execute
 * @param limit - Maximum number of concurrent executions
 * @returns Promise that resolves to an array of results (in order)
 */
export async function limitConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let currentIndex = 0;

  async function runNext(): Promise<void> {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;
      results[index] = await tasks[index]();
    }
  }

  // Start `limit` number of workers
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    runNext()
  );

  await Promise.all(workers);
  return results;
}

/**
 * Run async functions with limited concurrency, settling all promises.
 * Returns PromiseSettledResult array like Promise.allSettled.
 *
 * @param tasks - Array of async functions to execute
 * @param limit - Maximum number of concurrent executions
 * @returns Promise that resolves to an array of PromiseSettledResult (in order)
 */
export async function limitConcurrencySettled<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let currentIndex = 0;

  async function runNext(): Promise<void> {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;
      try {
        const value = await tasks[index]();
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  // Start `limit` number of workers
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    runNext()
  );

  await Promise.all(workers);
  return results;
}

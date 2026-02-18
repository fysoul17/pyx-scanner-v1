/**
 * Retry utility with exponential backoff + jitter for transient network failures.
 */

export class TransientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "TransientError";
  }
}

const TRANSIENT_MESSAGES = [
  "fetch failed",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
  "socket hang up",
];

export function isTransientError(err: unknown): boolean {
  if (err instanceof TransientError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_MESSAGES.some((t) => msg.includes(t));
}

export function isTransientStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

interface RetryOptions {
  attempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  label?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions
): Promise<T> {
  const attempts = opts?.attempts ?? 3;
  const baseDelay = opts?.baseDelay ?? 1000;
  const maxDelay = opts?.maxDelay ?? 10_000;
  const label = opts?.label ?? "request";

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === attempts || !isTransientError(err)) {
        throw err;
      }

      // Exponential backoff: baseDelay * 2^(attempt-1), capped at maxDelay
      const exponential = baseDelay * Math.pow(2, attempt - 1);
      const capped = Math.min(exponential, maxDelay);
      // Add 50-100% jitter
      const jitter = capped * (0.5 + Math.random() * 0.5);
      const delay = Math.round(jitter);

      console.warn(
        `  Retry ${attempt}/${attempts - 1} for ${label} in ${delay}ms — ${err instanceof Error ? err.message : err}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

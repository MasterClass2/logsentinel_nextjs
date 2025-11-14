import { LogPayload } from './types';

/**
 * In-memory queue with size limits (attempt to prevents memory leaks)
 * Simple FIFO queue.
 */
export class LogQueue {
  private queue: LogPayload[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Add a log to the queue. If full, drop the oldest log.
   * (Sorry old logs, but memory is precious)
   */
  enqueue(log: LogPayload): void {
    if (this.queue.length >= this.maxSize) {
      this.queue.shift(); // Drop oldest
      console.warn('[LogSentinel] Queue full. Dropping oldest log.');
    }
    this.queue.push(log);
  }

  /**
   * Get logs up to batchSize and remove them from queue
   */
  dequeue(batchSize: number): LogPayload[] {
    return this.queue.splice(0, batchSize);
  }

  /**
   * Check queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear all logs (nuclear option)
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}

import { LogSentinelConfig, LogPayload, LogBatch } from './types';
import { NetworkError } from './error';
import { LogQueue } from './queue';
import { generateBatchId } from './utils';

/**
 * LogSentinel client with batching, retry, and fire-and-forget sending
 * (Never blocks the main thread, prefer async all the way)
 */
export class LogSentinelClient {
  private config: LogSentinelConfig;
  private queue: LogQueue;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: LogSentinelConfig) {
    this.config = config;
    this.queue = new LogQueue(config.maxQueueSize);
    
    if (config.debug) {
      console.log('[LogSentinel Debug] Client initialized', {
        baseUrl: config.baseUrl,
        batchSize: config.batchSize,
        batchInterval: config.batchInterval,
        maxQueueSize: config.maxQueueSize,
      });
    }
    
    // Start batch flusher
    this.startBatchFlusher();
  }

  /**
   * Add a log to the queue (non-blocking)
   */
  log(payload: LogPayload): void {
    // Apply sampling (random dropout for performance)
    if (Math.random() > this.config.sampleRate!) {
      if (this.config.debug) {
        console.log('[LogSentinel Debug] Log skipped (sampling)', {
          traceId: payload.traceId,
          sampleRate: this.config.sampleRate,
        });
      }
      return; // Skip this log
    }

    this.queue.enqueue(payload);

    if (this.config.debug) {
      console.log('[LogSentinel Debug] Log queued', {
        traceId: payload.traceId,
        method: payload.method,
        path: payload.path,
        statusCode: payload.statusCode,
        duration: payload.duration,
        queueSize: this.queue.size(),
      });
    }

    // If batch size reached, flush immediately (but don't wait for it)
    if (this.queue.size() >= this.config.batchSize!) {
      if (this.config.debug) {
        console.log('[LogSentinel Debug] Batch size reached, flushing immediately', {
          queueSize: this.queue.size(),
          batchSize: this.config.batchSize,
        });
      }
      void this.flush(); // Fire-and-forget
    }
  }

  /**
   * Send batched logs to server
   */
  private async flush(): Promise<void> {
    if (this.queue.isEmpty()) return;

    const logs = this.queue.dequeue(this.config.batchSize!);
    if (logs.length === 0) return;

    const batch: LogBatch = {
      logs,
      batchId: generateBatchId(),
      sentAt: new Date().toISOString(),
    };

    try {
      await this.sendBatch(batch);
    } catch (error) {
      // Fail softly and log error but don't crash the main app
      console.warn('[LogSentinel] Failed to send batch:', (error as Error).message);
    }
  }

  /**
   * Send batch with retry logic (exponential backoff: 1s, 2s, 4s)
   * Why exponential? Because the server will need time to recover, not more requests
   */
  private async sendBatch(batch: LogBatch, attempt = 1): Promise<void> {
    const maxAttempts = 3;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    const sendStartTime = Date.now();

    if (this.config.debug) {
      console.log('[LogSentinel Debug] Sending batch', {
        batchId: batch.batchId,
        logCount: batch.logs.length,
        endpoint: this.config.baseUrl,
        timestamp: batch.sentAt,
        attempt,
      });
      
      // Show sample log (first one)
      const sampleLog = batch.logs[0];
      console.log('[LogSentinel Debug] Sample log entry:', {
        traceId: sampleLog.traceId,
        method: sampleLog.method,
        path: sampleLog.path,
        statusCode: sampleLog.statusCode,
        duration: sampleLog.duration,
        hasRequestBody: !!sampleLog.requestBody,
        requestBodySize: sampleLog.requestBody ? JSON.stringify(sampleLog.requestBody).length : 0,
        hasResponseBody: !!sampleLog.responseBody,
        responseBodySize: sampleLog.responseBody ? JSON.stringify(sampleLog.responseBody).length : 0,
      });
      
      // Print actual request body in debug mode
      if (sampleLog.requestBody) {
        console.log('[LogSentinel Debug] Request body:', sampleLog.requestBody);
      }
      
      // Show full batch only if explicitly requested
      const verboseDebug = process.env.LOGSENTINEL_DEBUG_VERBOSE === 'true' || 
                           process.env.NEXT_PUBLIC_LOGSENTINEL_DEBUG_VERBOSE === 'true';
      if (verboseDebug) {
        console.log('[LogSentinel Debug] Full batch contents:', JSON.stringify(batch, null, 2));
      }
    }

    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-LogSentinel-Version': '0.1.0',
        },
        body: JSON.stringify(batch),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new NetworkError(`Server returned ${response.status}: ${response.statusText}`);
      }

      if (this.config.debug) {
        console.log('[LogSentinel Debug] Batch sent successfully', {
          batchId: batch.batchId,
          logCount: batch.logs.length,
          attempt,
          responseStatus: response.status,
          duration: Date.now() - sendStartTime,
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (this.config.debug) {
        console.error('[LogSentinel Debug] Batch send failed', {
          batchId: batch.batchId,
          attempt,
          error: (error as Error).message,
          willRetry: attempt < maxAttempts,
          nextRetryDelay: attempt < maxAttempts ? Math.pow(2, attempt) * 1000 : null,
        });
      }

      // Retry with exponential backoff we mentioned before (up there)
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        if (this.config.debug) {
          console.log(`[LogSentinel Debug] Retrying in ${delay}ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendBatch(batch, attempt + 1);
      }

      throw error; // Here, the final attempt failed, and we just give up
    }
  }


  /**
   * Start interval-based batch flusher ( this is like a background worker)
   */
  private startBatchFlusher(): void {
    this.flushTimer = setInterval(() => {
      void this.flush(); // Fire-and-forget
    }, this.config.batchInterval);
  }

  /**
   * Clean up resources (call this on app shutdown/kill)
   */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Final flush to send remaining logs
    await this.flush();
  }
}

// Singleton client instance (one client per process)
let clientInstance: LogSentinelClient | null = null;

export function getClient(config: LogSentinelConfig): LogSentinelClient {
  if (!clientInstance) {
    clientInstance = new LogSentinelClient(config);
  }
  return clientInstance;
}

/**
 * Reset client instance (this is particularly useful for testing this sdk)
 */
export function resetClient(): void {
  if (clientInstance) {
    void clientInstance.destroy();
    clientInstance = null;
  }
}

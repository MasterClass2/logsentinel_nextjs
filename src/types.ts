/**
 * Core types for the LogSentinel SDK
 */

export interface LogSentinelConfig {
  apiKey: string;
  baseUrl: string;
  enabled?: boolean;
  sampleRate?: number; // 0.0 to 1.0 (1.0 = log everything)
  batchSize?: number; // Number of logs to batch before sending
  batchInterval?: number; // Milliseconds to wait before sending batch
  maxQueueSize?: number; // Max logs to keep in memory
  timeout?: number; // Request timeout in milliseconds
  debug?: boolean; // Enable detailed logging for troubleshooting
}

export interface LogPayload {
  traceId: string;
  timestamp: string; // ISO 8601
  method: string; // GET, POST, Patch...
  path: string;
  statusCode: number;
  duration: number; // milliseconds
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  error?: {
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

export interface LogBatch {
  logs: LogPayload[];
  batchId: string;
  sentAt: string;
}

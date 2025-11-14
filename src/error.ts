/**
 * Custom error types for LogSentinel SDK
 * (Lightweight errors, no long shenanigans)
 */

export class LogSentinelError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'LogSentinelError';
  }
}

export class ConfigError extends LogSentinelError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
  }
}

export class NetworkError extends LogSentinelError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
  }
}

export class QueueError extends LogSentinelError {
  constructor(message: string) {
    super(message, 'QUEUE_ERROR');
  }
}

import { LogSentinelConfig } from './types';

const DEFAULT_CONFIG: Partial<LogSentinelConfig> = {
  enabled: true,
  sampleRate: 1.0,
  batchSize: 10,
  batchInterval: 5000, // 5 seconds
  maxQueueSize: 1000,
  timeout: 5000, // 5 seconds
  captureResponseBody: false, // Disabled by default for performance
};

/**
 * Reads config from environment variables or returns null if not configured.
 * Never screams loud, just fail soft (because we are nice people and we dont shout fwaaa)
 */
export function getConfig(): LogSentinelConfig | null {
  // Support both server and client-side env vars
  const apiKey = process.env.LOGSENTINEL_API_KEY || process.env.NEXT_PUBLIC_LOGSENTINEL_API_KEY;
  const baseUrl = process.env.LOGSENTINEL_BASE_URL || process.env.NEXT_PUBLIC_LOGSENTINEL_BASE_URL;
  const debug = process.env.LOGSENTINEL_DEBUG === 'true' || process.env.NEXT_PUBLIC_LOGSENTINEL_DEBUG === 'true';

  if (!apiKey || !baseUrl) {
    const missing = [];
    if (!apiKey) missing.push('LOGSENTINEL_API_KEY');
    if (!baseUrl) missing.push('LOGSENTINEL_BASE_URL');
    
    console.warn(
      `[LogSentinel] SDK disabled - missing environment variables: ${missing.join(', ')}\n` +
      `Please add to your .env.local file:\n` +
      `  LOGSENTINEL_API_KEY=your_api_key\n` +
      `  LOGSENTINEL_BASE_URL=https://your-logging-server.com`
    );
    return null;
  }

  const config = {
    apiKey,
    baseUrl,
    ...DEFAULT_CONFIG,
    // Allow overrides from env, for developer convenience
    sampleRate: parseFloat(process.env.LOGSENTINEL_SAMPLE_RATE || '1.0'),
    batchSize: parseInt(process.env.LOGSENTINEL_BATCH_SIZE || '10', 10),
    batchInterval: parseInt(process.env.LOGSENTINEL_BATCH_INTERVAL || '5000', 10),
    maxQueueSize: parseInt(process.env.LOGSENTINEL_MAX_QUEUE_SIZE || '1000', 10),
    timeout: parseInt(process.env.LOGSENTINEL_TIMEOUT || '5000', 10),
    captureResponseBody: process.env.LOGSENTINEL_CAPTURE_RESPONSE_BODY === 'true',
    debug,
  };

  if (debug) {
    console.log('[LogSentinel Debug] Configuration loaded:', {
      baseUrl: config.baseUrl,
      hasApiKey: !!config.apiKey,
      sampleRate: config.sampleRate,
      batchSize: config.batchSize,
      batchInterval: config.batchInterval,
      maxQueueSize: config.maxQueueSize,
      timeout: config.timeout,
    });
  }

  return config;
}

// Cached config (read once per process; efficiency matters here)
let cachedConfig: LogSentinelConfig | null | undefined;

export function getCachedConfig(): LogSentinelConfig | null {
  if (cachedConfig === undefined) {
    cachedConfig = getConfig();
  }
  return cachedConfig;
}

/**
 * Reset cached config (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = undefined;
}

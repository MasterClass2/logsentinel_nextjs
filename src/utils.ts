/**
 * Utility functions for LogSentinel SDK
 * (Stateless)
 */

/**
 * Generate a unique trace ID for each request
 * (Using crypto for randomness because Math.random() is not random enough here)
 */
export function generateTraceId(): string {
  // Browser-compatible random ID generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate a unique batch ID
 */
export function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Sanitize headers (remove sensitive data)
 * Why? Because we're not in the business of leaking API keys and passwords
 */
export function sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'api-key'];

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (Array.isArray(value)) {
      sanitized[key] = value.join(', ');
    } else {
      sanitized[key] = String(value);
    }
  }

  return sanitized;
}

/**
 * Sanitize request/response body (limit size, redact sensitive fields)
 * (Privacy first, we don't want passwords in our logs)
 */
export function sanitizeBody(body: any): any {
  if (!body) return undefined;

  try {
    const jsonString = typeof body === 'string' ? body : JSON.stringify(body);
    
    // Truncate large bodies (nobody needs 10MB of logs)
    if (jsonString.length > 10000) {
      return {
        _truncated: true,
        _originalSize: jsonString.length,
        _preview: jsonString.substring(0, 500) + '...',
      };
    }

    // Parse and redact sensitive fields
    const parsed = typeof body === 'string' ? JSON.parse(jsonString) : body;
    
    if (typeof parsed === 'object' && parsed !== null) {
      return redactSensitiveFields(parsed);
    }

    return parsed;
  } catch {
    // If parsing fails, return a safe truncated string
    const str = String(body);
    return str.length > 500 ? str.substring(0, 500) + '...' : str;
  }
}

/**
 * Recursively (hehe, big word here) redact sensitive fields from objects
 * (Handles nested objects because attackers are sneaky)
 */
function redactSensitiveFields(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveFields(item));
  }

  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'auth',
    'authorization',
    'creditCard',
    'credit_card',
    'ssn',
    'privateKey',
    'private_key',
  ];

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveFields(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format timestamp in ISO 8601
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Calculate duration between two timestamps
 */
export function calculateDuration(startTime: number, endTime: number = Date.now()): number {
  return endTime - startTime;
}

import { describe, it, expect } from 'vitest';
import { 
  generateTraceId, 
  generateBatchId, 
  sanitizeHeaders, 
  sanitizeBody 
} from '../src/utils';

describe('Utils', () => {
  describe('generateTraceId', () => {
    it('should generate unique trace IDs', () => {
      const id1 = generateTraceId();
      const id2 = generateTraceId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateBatchId', () => {
    it('should generate unique batch IDs with prefix', () => {
      const id1 = generateBatchId();
      const id2 = generateBatchId();
      
      expect(id1).toMatch(/^batch_/);
      expect(id2).toMatch(/^batch_/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('sanitizeHeaders', () => {
    it('should redact sensitive headers', () => {
      const headers = {
        'content-type': 'application/json',
        'authorization': 'Bearer secret-token',
        'cookie': 'session=abc123',
        'x-api-key': 'my-api-key',
      };

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized['content-type']).toBe('application/json');
      expect(sanitized['authorization']).toBe('[REDACTED]');
      expect(sanitized['cookie']).toBe('[REDACTED]');
      expect(sanitized['x-api-key']).toBe('[REDACTED]');
    });

    it('should handle array values', () => {
      const headers = {
        'accept': ['application/json', 'text/html'],
      };

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized['accept']).toBe('application/json, text/html');
    });
  });

  describe('sanitizeBody', () => {
    it('should return undefined for null/undefined', () => {
      expect(sanitizeBody(null)).toBeUndefined();
      expect(sanitizeBody(undefined)).toBeUndefined();
    });

    it('should redact sensitive fields', () => {
      const body = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
        token: 'abc123',
      };

      const sanitized = sanitizeBody(body);

      expect(sanitized.username).toBe('john');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const body = {
        user: {
          name: 'john',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
      };

      const sanitized = sanitizeBody(body);

      expect(sanitized.user.name).toBe('john');
      expect(sanitized.user.credentials.password).toBe('[REDACTED]');
      expect(sanitized.user.credentials.apiKey).toBe('[REDACTED]');
    });

    it('should truncate large bodies', () => {
      const largeBody = { data: 'x'.repeat(20000) };
      const sanitized = sanitizeBody(largeBody);

      expect(sanitized._truncated).toBe(true);
      expect(sanitized._originalSize).toBeGreaterThan(10000);
      expect(sanitized._preview).toBeDefined();
    });

    it('should handle arrays', () => {
      const body = [
        { name: 'john', password: 'secret1' },
        { name: 'jane', password: 'secret2' },
      ];

      const sanitized = sanitizeBody(body);

      expect(sanitized[0].name).toBe('john');
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[1].name).toBe('jane');
      expect(sanitized[1].password).toBe('[REDACTED]');
    });
  });
});

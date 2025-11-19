import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withLogSentinel } from '../src/middleware';
import { resetConfig } from '../src/config';
import { resetClient } from '../src/client';

describe('withLogSentinel', () => {
  beforeEach(() => {
    resetConfig();
    resetClient();
    vi.clearAllMocks();
  });

  it('should wrap handler without blocking', async () => {
    // Setup env
    process.env.LOGSENTINEL_API_KEY = 'test-key';
    process.env.LOGSENTINEL_BASE_URL = 'https://test.com';

    const handler = vi.fn(async (req, res) => {
      res.json({ success: true });
    });

    const wrapped = withLogSentinel(handler);

    const req = { 
      method: 'GET', 
      url: '/test',
      headers: {},
      body: null,
    };
    
    const res = {
      json: vi.fn(),
      send: vi.fn(),
      end: vi.fn(),
      statusCode: 200,
      getHeaders: () => ({}),
    };

    await wrapped(req, res);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('should pass through when SDK is disabled', async () => {
    // No env vars set ===> SDK should be disabled
    delete process.env.LOGSENTINEL_API_KEY;
    delete process.env.LOGSENTINEL_BASE_URL;

    const handler = vi.fn(async (req, res) => {
      res.json({ success: true });
    });

    const wrapped = withLogSentinel(handler);

    const req = { method: 'GET', url: '/test' };
    const res = {
      json: vi.fn(),
      statusCode: 200,
      getHeaders: () => ({}),
    };

    await wrapped(req, res);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    process.env.LOGSENTINEL_API_KEY = 'test-key';
    process.env.LOGSENTINEL_BASE_URL = 'https://test.com';

    const handler = vi.fn(async () => {
      throw new Error('Test error');
    });

    const wrapped = withLogSentinel(handler);

    const req = { 
      method: 'GET', 
      url: '/test',
      headers: {},
      body: null,
    };
    
    const res = { 
      getHeaders: () => ({}),
      statusCode: 500,
    };

    await expect(wrapped(req, res)).rejects.toThrow('Test error');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should capture request metadata', async () => {
    process.env.LOGSENTINEL_API_KEY = 'test-key';
    process.env.LOGSENTINEL_BASE_URL = 'https://test.com';

    const handler = vi.fn(async (req, res) => {
      res.json({ data: 'test' });
    });

    const wrapped = withLogSentinel(handler);

    const req = {
      method: 'POST',
      url: '/api/users',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'test-agent',
      },
      body: { name: 'John' },
      query: { page: '1' },
    };

    const res = {
      json: vi.fn(),
      statusCode: 200,
      getHeaders: () => ({
        'content-type': 'application/json',
      }),
    };

    await wrapped(req, res);

    expect(handler).toHaveBeenCalledWith(req, res);
  });

  it('should capture response status codes', async () => {
    process.env.LOGSENTINEL_API_KEY = 'test-key';
    process.env.LOGSENTINEL_BASE_URL = 'https://test.com';

    const handler = vi.fn(async (req, res) => {
      res.statusCode = 404;
      res.json({ error: 'Not found' });
    });

    const wrapped = withLogSentinel(handler);

    const req = { 
      method: 'GET', 
      url: '/api/missing',
      headers: {},
    };
    
    const res = {
      json: vi.fn(),
      statusCode: 404,
      getHeaders: () => ({}),
    };

    await wrapped(req, res);

    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  });
});

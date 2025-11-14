import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConfig, resetConfig } from '../src/config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules and environment
    vi.resetModules();
    process.env = { ...originalEnv };
    resetConfig();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return null if env vars are missing', () => {
    delete process.env.LOGSENTINEL_API_KEY;
    delete process.env.LOGSENTINEL_BASE_URL;
    delete process.env.NEXT_PUBLIC_LOGSENTINEL_API_KEY;
    delete process.env.NEXT_PUBLIC_LOGSENTINEL_BASE_URL;

    const config = getConfig();
    expect(config).toBeNull();
  });

  it('should read config from env vars', () => {
    process.env.LOGSENTINEL_API_KEY = 'test-key-123';
    process.env.LOGSENTINEL_BASE_URL = 'https://test.sentinel.com';

    const config = getConfig();
    expect(config).toMatchObject({
      apiKey: 'test-key-123',
      baseUrl: 'https://test.sentinel.com',
    });
  });

  it('should use NEXT_PUBLIC_ prefixed env vars', () => {
    process.env.NEXT_PUBLIC_LOGSENTINEL_API_KEY = 'public-key';
    process.env.NEXT_PUBLIC_LOGSENTINEL_BASE_URL = 'https://public.sentinel.com';

    const config = getConfig();
    expect(config).toMatchObject({
      apiKey: 'public-key',
      baseUrl: 'https://public.sentinel.com',
    });
  });

  it('should use default values', () => {
    process.env.LOGSENTINEL_API_KEY = 'test-key';
    process.env.LOGSENTINEL_BASE_URL = 'https://test.com';

    const config = getConfig();
    expect(config?.batchSize).toBe(10);
    expect(config?.sampleRate).toBe(1.0);
    expect(config?.batchInterval).toBe(5000);
    expect(config?.maxQueueSize).toBe(1000);
    expect(config?.timeout).toBe(5000);
    expect(config?.enabled).toBe(true);
  });

  it('should allow env var overrides for batch size', () => {
    process.env.LOGSENTINEL_API_KEY = 'test-key';
    process.env.LOGSENTINEL_BASE_URL = 'https://test.com';
    process.env.LOGSENTINEL_BATCH_SIZE = '25';

    const config = getConfig();
    expect(config?.batchSize).toBe(25);
  });

  it('should allow env var overrides for sample rate', () => {
    process.env.LOGSENTINEL_API_KEY = 'test-key';
    process.env.LOGSENTINEL_BASE_URL = 'https://test.com';
    process.env.LOGSENTINEL_SAMPLE_RATE = '0.5';

    const config = getConfig();
    expect(config?.sampleRate).toBe(0.5);
  });

  it('should warn when config is missing', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    getConfig();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[LogSentinel] Missing LOGSENTINEL_API_KEY')
    );

    consoleWarnSpy.mockRestore();
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { getCachedConfig } from './config';
import { getClient } from './client';
import { LogPayload } from './types';
import { generateTraceId, sanitizeHeaders, sanitizeBody } from './utils';

/**
 * Middleware for Next.js App Router (middleware.ts)
 * Captures all incoming requests and responses
 * (Non-blocking: async)
 */
export function logSentinelMiddleware(request: NextRequest): NextResponse | Promise<NextResponse> {
  const config = getCachedConfig();
  
  // SDK disabled, pass through silently
  if (!config) {
    return NextResponse.next();
  }

  const client = getClient(config);
  const traceId = generateTraceId();
  const startTime = Date.now();

  // Continue the request (don't block)
  const response = NextResponse.next();

  // Fire-and-forget: capture log asynchronously
  Promise.resolve().then(async () => {
    const duration = Date.now() - startTime;
    
    // Attempt to extract request body (just clone request to avoid consuming it)
    let requestBody;
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const clonedRequest = request.clone();
        requestBody = await clonedRequest.json().catch(() => undefined);
      }
    } catch {
      // Body already consumed or not JSON
      requestBody = undefined;
    }

    const logPayload: LogPayload = {
      traceId,
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.nextUrl.pathname,
      statusCode: response.status,
      duration,
      requestHeaders: sanitizeHeaders(Object.fromEntries(request.headers)),
      responseHeaders: sanitizeHeaders(Object.fromEntries(response.headers)),
      requestBody: requestBody ? sanitizeBody(requestBody) : undefined,
      // Note: Response body is harder to extract in middleware without consuming it, so we avoid it for now. if it becomes necessary in the future...
      responseBody: undefined,
      metadata: {
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.ip,
        query: Object.fromEntries(request.nextUrl.searchParams),
      },
    };

    client.log(logPayload);
  });

  return response;
}

/**
 * Higher-order function for API routes (Pages Router)
 * Usage: export default withLogSentinel(handler)
 * 
 * This wraps your handler and captures request/response metadata
 */
export function withLogSentinel<T = any>(
  handler: (req: any, res: any) => Promise<T> | T
) {
  return async (req: any, res: any): Promise<T> => {
    const config = getCachedConfig();

    // SDK disabled, pass through silently
    if (!config) {
      return handler(req, res);
    }

    const client = getClient(config);
    const traceId = generateTraceId();
    const startTime = Date.now();

    // Wrap res.json, res.send, res.end to capture response
    const originalJson = res.json;
    const originalSend = res.send;
    const originalEnd = res.end;

    let responseBody: any;
    let statusCode = 200;

    // Intercept JSON responses
    res.json = function (body: any) {
      responseBody = body;
      statusCode = res.statusCode;
      return originalJson.call(this, body);
    };

    // Intercept send responses
    res.send = function (body: any) {
      responseBody = body;
      statusCode = res.statusCode;
      return originalSend.call(this, body);
    };

    // Intercept end (catch-all)
    res.end = function (chunk: any, encoding?: any, callback?: any) {
      statusCode = res.statusCode;
      return originalEnd.call(this, chunk, encoding, callback);
    };

    try {
      const result = await handler(req, res);

      // Fire-and-forget: log after response is sent
      Promise.resolve().then(() => {
        const duration = Date.now() - startTime;

        const logPayload: LogPayload = {
          traceId,
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.url,
          statusCode,
          duration,
          requestHeaders: sanitizeHeaders(req.headers),
          responseHeaders: sanitizeHeaders(res.getHeaders()),
          requestBody: sanitizeBody(req.body),
          responseBody: sanitizeBody(responseBody),
          metadata: {
            query: req.query,
            userAgent: req.headers['user-agent'],
          },
        };

        client.log(logPayload);
      });

      return result;
    } catch (error) {
      // Log errors too (this is basically why we and our SDK exist in the first place)
      Promise.resolve().then(() => {
        const duration = Date.now() - startTime;

        const logPayload: LogPayload = {
          traceId,
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.url,
          statusCode: 500,
          duration,
          requestHeaders: sanitizeHeaders(req.headers),
          requestBody: sanitizeBody(req.body),
          error: {
            message: (error as Error).message,
            stack: (error as Error).stack,
          },
          metadata: {
            query: req.query,
          },
        };

        client.log(logPayload);
      });

      throw error; // Re-throw to preserve original behavior
    }
  };
}

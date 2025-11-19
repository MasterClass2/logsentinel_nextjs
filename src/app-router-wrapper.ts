/**
 * App Router route handler wrapper for full request/response capture
 * 
 * This is an OPTIONAL wrapper for developers who want full response body capture
 * in App Router routes. Unlike the global middleware, this requires wrapping each
 * route handler individually.
 * 
 * @example
 * ```typescript
 * // app/api/users/route.ts
 * import { withLogSentinelAppRouter } from 'logsentinel-nextjs/app-router';
 * 
 * export const POST = withLogSentinelAppRouter(async (request) => {
 *   const data = await request.json();
 *   return Response.json({ success: true, data });
 * });
 * ```
 */

import { getCachedConfig } from './config';
import { getClient } from './client';
import { generateTraceId, sanitizeHeaders } from './utils';

function headersToObject(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};

  if (!headers) return out;

  try {
    const h: any = headers;

    if (typeof h.forEach === 'function') {
      h.forEach((value: string, key: string) => {
        out[String(key)] = String(value);
      });
      return out;
    }

    const entries = Array.from(h as Iterable<[string, string]> || []);
    if (entries.length) {
      for (const [k, v] of entries) out[String(k)] = String(v);
      return out;
    }
  } catch {}

  return out;
}

type RouteHandler = (request: Request, context?: any) => Promise<Response> | Response;

/**
 * Wraps an App Router route handler to capture request + response bodies
 */
export function withLogSentinelAppRouter(handler: RouteHandler): RouteHandler {
  return async function wrappedHandler(request: Request, context?: any): Promise<Response> {
    const config = getCachedConfig();
    
    // Pass through if SDK is disabled
    if (!config) {
      return handler(request, context);
    }

    const client = getClient(config);
    const startTime = Date.now();
    const traceId = generateTraceId();
    const url = new URL(request.url);

    // Capture request body (if it is present)
    let requestBody: any;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const clone = request.clone();
        const text = await clone.text();
        if (text) {
          requestBody = JSON.parse(text);
        }
      } catch {
        // Not JSON or empty body:- ignore
      }
    }

    let response: Response;
    let responseBody: any;
    let error: { message: string; stack?: string } | undefined;

    try {
      // Call the actual handler
      response = await handler(request, context);

      // Capture response body
      try {
        const clone = response.clone();
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          responseBody = await clone.json();
        } else {
          const text = await clone.text();
          responseBody = text.substring(0, 1000); // Truncate large text responses
        }
      } catch {
        // Cannot read response body:- just ignore
      }
    } catch (err) {
      // Handler threw an error
      error = {
        message: (err as Error).message,
        stack: (err as Error).stack,
      };
      
      // Create error response
      response = Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;

    // Log asynchronously (fire-and-forget)
    void (async () => {
      try {
        client.log({
          traceId,
          timestamp: new Date().toISOString(),
          method: request.method,
          path: url.pathname,
          statusCode: response.status,
          duration,
          requestHeaders: sanitizeHeaders(headersToObject(request.headers)),
          responseHeaders: sanitizeHeaders(headersToObject(response.headers)),
          requestBody,
          responseBody,
          error,
          metadata: {
            query: Object.fromEntries(url.searchParams),
            integration: 'app-router-wrapper',
          },
        });
      } catch (logError) {
        // Never let logging crash the app
        if (config.debug) {
          console.warn('[LogSentinel] Failed to log request:', (logError as Error).message);
        }
      }
    })();

    return response;
  };
}

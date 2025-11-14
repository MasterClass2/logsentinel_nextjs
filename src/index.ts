/**
 * LogSentinel Next.js SDK
 * 
 * Minimal-config observability for Next.js applications.
 * Non-blocking, lightweight, and built to never crash your app (hopefully anyway).
 * 
 * @example App Router (middleware.ts)
 * ```typescript
 * import { logSentinelMiddleware } from 'logsentinel-nextjs';
 * export const middleware = logSentinelMiddleware;
 * ```
 * 
 * @example Pages Router (API route)
 * ```typescript
 * import { withLogSentinel } from 'logsentinel-nextjs';
 * 
 * async function handler(req, res) {
 *   res.json({ message: 'Hello' });
 * }
 * 
 * export default withLogSentinel(handler);
 * ```
 * 
 * @see https://sentinel.ipvs.cloud
 */

export { logSentinelMiddleware, withLogSentinel } from './middleware';
export { getConfig, getCachedConfig, resetConfig } from './config';
export { getClient, resetClient } from './client';
export type { LogSentinelConfig, LogPayload, LogBatch } from './types';

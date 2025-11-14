/**
 * Example: LogSentinel Middleware for Next.js App Router
 * 
 * Place this file in your project root to enable automatic logging
 * for all routes (or use the matcher config to target specific paths)
 */

import { logSentinelMiddleware } from 'logsentinel-nextjs';

export const middleware = logSentinelMiddleware;

// Optional: Configure which routes to monitor
export const config = {
  matcher: [
    // Monitor all API routes
    '/api/:path*',
    
    // Monitor specific app routes
    '/dashboard/:path*',
    '/admin/:path*',
    
    // Exclude Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

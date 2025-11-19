# LogSentinel Next.js SDK

> Lightweight, non-blocking observability for Next.js apps

[![npm version](https://img.shields.io/npm/v/logsentinel-nextjs.svg)](https://www.npmjs.com/package/logsentinel-nextjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- **Non-blocking** — Fire-and-forget logging that never slows down your app
- **Automatic batching** — Efficient log transmission with configurable batch sizes
- **Smart retry** — Exponential backoff for failed requests
- **Fail-safe** — Graceful degradation; never crashes your app
- **Privacy-first** — Automatic redaction of sensitive data
- **Sampling** — Configurable sampling rate for high-traffic apps
-  **Zero config** — Works out of the box with environment variables
- **TypeScript** — Full type safety included

## Installation

```bash
npm install logsentinel-nextjs
# or
yarn add logsentinel-nextjs
# or
pnpm add logsentinel-nextjs
```

## Quick Start

### 1. Add Environment Variables

Create a `.env.local` file in your project root:

```env
LOGSENTINEL_API_KEY=your_api_key_here
LOGSENTINEL_BASE_URL=https://sentinel.ipvs.cloud/api/sdk/logs
LOGSENTINEL_SAMPLE_RATE=1.0
LOGSENTINEL_BATCH_SIZE=10
LOGSENTINEL_BATCH_INTERVAL=5000

# Debug Mode - Set to 'true' to see detailed SDK logging
# Shows: connection status, batch creation, send success/failure, full log payloads
# Useful for troubleshooting configuration issues or verifying log capture
LOGSENTINEL_DEBUG=false

# Optional: Route filtering (comma-separated patterns)
# Example: LOGSENTINEL_INCLUDE_ROUTES=/api/users/:path*,/api/payments/:path*
# Example: LOGSENTINEL_EXCLUDE_ROUTES=/api/health,/api/ping
# LOGSENTINEL_INCLUDE_ROUTES=
# LOGSENTINEL_EXCLUDE_ROUTES=
```

### 2. App Router (Next.js 13+)

Create or update `middleware.ts` in your project root:

```typescript
import { logSentinelMiddleware } from 'logsentinel-nextjs';

export const middleware = logSentinelMiddleware;

// Optional: Configure which routes to monitor
export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
  ],
};
```

### 3. Pages Router (Next.js 12)

Wrap your API route handlers:

```typescript
// pages/api/hello.ts
import { withLogSentinel } from 'logsentinel-nextjs';

async function handler(req, res) {
  res.status(200).json({ message: 'Hello from LogSentinel!' });
}

export default withLogSentinel(handler);
```

That's it! Your logs are now being captured and sent to LogSentinel for analysis.

## Some few Configuration

All configuration is done via environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOGSENTINEL_API_KEY` | Yes | - | Your LogSentinel API key |
| `LOGSENTINEL_BASE_URL` | Yes | - | LogSentinel server URL |
| `LOGSENTINEL_SAMPLE_RATE` | No | `1.0` | Sample rate (0.0 - 1.0) |
| `LOGSENTINEL_BATCH_SIZE` | No | `10` | Logs per batch |
| `LOGSENTINEL_BATCH_INTERVAL` | No | `5000` | Batch interval (ms) |
| `LOGSENTINEL_MAX_QUEUE_SIZE` | No | `1000` | Max logs in memory |
| `LOGSENTINEL_TIMEOUT` | No | `5000` | Request timeout (ms) |

### Example Configuration

```env
# Required
LOGSENTINEL_API_KEY=sk_live_abc123xyz
LOGSENTINEL_BASE_URL=https://sentinel.ipvs.cloud

# Optional: Sample 50% of requests for high-traffic apps
LOGSENTINEL_SAMPLE_RATE=0.5

# Optional: Send logs every 20 requests
LOGSENTINEL_BATCH_SIZE=20

# Optional: Flush logs every 10 seconds
LOGSENTINEL_BATCH_INTERVAL=10000
```


## License

MIT © LogSentinel

## Links

- [GitHub](https://github.com/yourusername/logsentinel-nextjs)
- [npm](https://www.npmjs.com/package/logsentinel-nextjs)

## Need Help?

-  Email: eliakimdev52@gmail.com

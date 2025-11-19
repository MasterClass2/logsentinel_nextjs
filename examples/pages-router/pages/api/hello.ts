/**
 * Example: LogSentinel wrapper for Pages Router API route
 * 
 * Wrap your API handler with withLogSentinel to automatically
 * capture request/response metadata
 */

import { withLogSentinel } from 'logsentinel-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ResponseData {
  message: string;
  timestamp: string;
  method: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Your API logic here
  const data: ResponseData = {
    message: 'Hello from LogSentinel!',
    timestamp: new Date().toISOString(),
    method: req.method || 'UNKNOWN',
  };

  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));

  res.status(200).json(data);
}

// Export the wrapped handler; LogSentinel will automatically log it
export default withLogSentinel(handler);

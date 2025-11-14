/**
 * Example: Error handling with LogSentinel
 * 
 * Errors are automatically captured and logged, including stack traces
 */

import { withLogSentinel } from 'logsentinel-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    // Simulate database lookup
    if (id === '404') {
      return res.status(404).json({ error: 'User not found' });
    }

    if (id === 'error') {
      throw new Error('Simulated database error');
    }

    // Success case
    res.status(200).json({
      id,
      name: 'John Doe',
      email: 'john@example.com',
    });
  } catch (error) {
    // Error is automatically logged by LogSentinel
    res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

export default withLogSentinel(handler);

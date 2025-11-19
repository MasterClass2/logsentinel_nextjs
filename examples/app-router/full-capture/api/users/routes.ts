/**
 * Example: App Router with FULL request/response capture
 * 
 * This approach requires wrapping each route handler individually,
 * but provides complete request + response body logging.
 * 
 * Use this when you need full observability for specific routes.
 */

import { withLogSentinelAppRouter } from 'logsentinel-nextjs';

export const GET = withLogSentinelAppRouter(async (request: Request) => {
  return Response.json({
    users: [
      { id: 1, name: 'Okeyo', email: 'okeyo@example.com' },
      { id: 2, name: 'Wamunyoro', email: 'wamunyoro@example.com' },
    ],
  });
});

export const POST = withLogSentinelAppRouter(async (request: Request) => {
  const body = await request.json();
  
  // Simulate user creation
  const newUser = {
    id: Date.now(),
    ...body,
    createdAt: new Date().toISOString(),
  };

  return Response.json(newUser, { status: 201 });
});

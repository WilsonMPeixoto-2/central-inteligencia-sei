import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/routers';
import type { TrpcContext } from '../../server/_core/context';

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async (): Promise<TrpcContext> => {
      // In serverless environment, we don't have req/res objects
      // Context is simplified for public access
      return {
        req: req as any,
        res: {} as any,
        user: null,
      };
    },
  });
};

export const GET = handler;
export const POST = handler;
export const runtime = 'nodejs';

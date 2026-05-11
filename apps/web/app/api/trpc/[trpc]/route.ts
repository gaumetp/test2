import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@clerk/nextjs/server";
import { appRouter, createTRPCContext } from "@tattoo-saas/api";
import { NextRequest } from "next/server";

const handler = async (req: NextRequest) => {
  const { userId } = await auth();

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: req.headers,
        userId,
      }),
    ...(process.env.NODE_ENV === "development" && {
      onError: ({ path, error }: { path: string | undefined; error: unknown }) => {
        console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
      },
    }),
  });
};

export { handler as GET, handler as POST };

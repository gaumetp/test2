import "server-only";
import { createCallerFactory, createTRPCContext } from "@tattoo-saas/api";
import { appRouter } from "@tattoo-saas/api";
import { auth } from "@clerk/nextjs/server";
import { cache } from "react";

const createCaller = createCallerFactory(appRouter);

const createContext = cache(async () => {
  const { userId } = await auth();
  return createTRPCContext({
    headers: new Headers(),
    userId,
  });
});

export const api = createCaller(createContext);

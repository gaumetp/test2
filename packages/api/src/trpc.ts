import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import SuperJSON from "superjson";
import { db } from "@tattoo-saas/db";
import type { Database } from "@tattoo-saas/db";

export interface TRPCContext {
  db: Database;
  userId: string | null;
  headers: Headers;
}

export async function createTRPCContext(opts: {
  headers: Headers;
  userId?: string | null;
}): Promise<TRPCContext> {
  return {
    db,
    userId: opts.userId ?? null,
    headers: opts.headers,
  };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: SuperJSON,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// ─── Procedures ──────────────────────────────────────────────────────────────

export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

const enforceArtist = enforceAuth.unstable_pipe(async ({ ctx, next }) => {
  const user = await ctx.db.query.users.findFirst({
    where: (u, { eq }) => eq(u.clerkId, ctx.userId),
  });
  if (!user || (user.role !== "artist" && user.role !== "studio_owner" && user.role !== "admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Artist account required" });
  }
  return next({ ctx: { ...ctx, user } });
});

export const artistProcedure = t.procedure.use(enforceArtist);

const enforceAdmin = enforceAuth.unstable_pipe(async ({ ctx, next }) => {
  const user = await ctx.db.query.users.findFirst({
    where: (u, { eq }) => eq(u.clerkId, ctx.userId),
  });
  if (!user || user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { ...ctx, user } });
});

export const adminProcedure = t.procedure.use(enforceAdmin);

"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@tattoo-saas/api";

export const trpc = createTRPCReact<AppRouter>();

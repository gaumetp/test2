import { createTRPCRouter } from "./trpc";
import { artistsRouter } from "./routers/artists";
import { bookingsRouter } from "./routers/bookings";
import { availabilityRouter } from "./routers/availability";
import { reviewsRouter } from "./routers/reviews";
import { paymentsRouter } from "./routers/payments";
import { messagesRouter } from "./routers/messages";
import { portfoliosRouter } from "./routers/portfolios";
import { notificationsRouter } from "./routers/notifications";

export const appRouter = createTRPCRouter({
  artists: artistsRouter,
  bookings: bookingsRouter,
  availability: availabilityRouter,
  reviews: reviewsRouter,
  payments: paymentsRouter,
  messages: messagesRouter,
  portfolios: portfoliosRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;

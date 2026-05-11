import { createTRPCRouter } from "./trpc.js";
import { artistsRouter } from "./routers/artists.js";
import { bookingsRouter } from "./routers/bookings.js";
import { availabilityRouter } from "./routers/availability.js";
import { reviewsRouter } from "./routers/reviews.js";
import { paymentsRouter } from "./routers/payments.js";
import { messagesRouter } from "./routers/messages.js";
import { portfoliosRouter } from "./routers/portfolios.js";
import { notificationsRouter } from "./routers/notifications.js";

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

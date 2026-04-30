import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "client",
  "artist",
  "studio_owner",
  "admin",
]);

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "pro",
  "studio",
  "studio_plus",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "cancelled",
  "trialing",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "deposit_paid",
  "completed",
  "cancelled",
  "no_show",
]);

export const serviceTypeEnum = pgEnum("service_type", [
  "custom",
  "flash",
  "touch_up",
]);

export const studioArtistRoleEnum = pgEnum("studio_artist_role", [
  "owner",
  "employee",
  "guest",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "booking_request",
  "booking_confirmed",
  "booking_declined",
  "booking_cancelled",
  "deposit_paid",
  "reminder_24h",
  "reminder_1h",
  "review_request",
  "new_message",
  "payout_sent",
]);

export const tattooStyleEnum = pgEnum("tattoo_style", [
  "realism",
  "blackwork",
  "traditional",
  "neo_traditional",
  "watercolor",
  "geometric",
  "japanese",
  "tribal",
  "fineline",
  "illustrative",
  "dotwork",
  "lettering",
  "new_school",
  "biomechanical",
  "portrait",
  "minimalist",
]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    role: userRoleEnum("role").notNull().default("client"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    clerkIdIdx: index("users_clerk_id_idx").on(t.clerkId),
    emailIdx: index("users_email_idx").on(t.email),
  })
);

// ─── Artist Profiles ─────────────────────────────────────────────────────────

export const artistProfiles = pgTable(
  "artist_profiles",
  {
    id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    bio: text("bio"),
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 100 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    styles: tattooStyleEnum("styles").array().notNull().default([]),
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
    minPrice: decimal("min_price", { precision: 10, scale: 2 }),
    instagramHandle: varchar("instagram_handle", { length: 100 }),
    websiteUrl: varchar("website_url", { length: 500 }),
    isVerified: boolean("is_verified").notNull().default(false),
    subscriptionTier: subscriptionTierEnum("subscription_tier").notNull().default("free"),
    stripeAccountId: varchar("stripe_account_id", { length: 255 }),
    stripeAccountEnabled: boolean("stripe_account_enabled").notNull().default(false),
    averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    totalBookings: integer("total_bookings").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("artist_profiles_slug_idx").on(t.slug),
    cityIdx: index("artist_profiles_city_idx").on(t.city),
    stylesIdx: index("artist_profiles_styles_idx").on(t.styles),
  })
);

// ─── Portfolio Items ──────────────────────────────────────────────────────────

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "cascade" }),
    imageUrl: varchar("image_url", { length: 1000 }).notNull(),
    cloudinaryPublicId: varchar("cloudinary_public_id", { length: 500 }),
    caption: text("caption"),
    style: tattooStyleEnum("style"),
    bodyPart: varchar("body_part", { length: 100 }),
    isFlash: boolean("is_flash").notNull().default(false),
    flashPrice: decimal("flash_price", { precision: 10, scale: 2 }),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    artistIdIdx: index("portfolio_items_artist_id_idx").on(t.artistId),
  })
);

// ─── Studios ─────────────────────────────────────────────────────────────────

export const studios = pgTable(
  "studios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull().references(() => users.id),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 100 }),
    lat: decimal("lat", { precision: 10, scale: 7 }),
    lng: decimal("lng", { precision: 10, scale: 7 }),
    logoUrl: varchar("logo_url", { length: 1000 }),
    subscriptionTier: subscriptionTierEnum("subscription_tier").notNull().default("studio"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const studioArtists = pgTable(
  "studio_artists",
  {
    studioId: uuid("studio_id").notNull().references(() => studios.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "cascade" }),
    role: studioArtistRoleEnum("role").notNull().default("employee"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.studioId, t.artistId] }),
  })
);

// ─── Availability ─────────────────────────────────────────────────────────────

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
    startTime: varchar("start_time", { length: 5 }).notNull(), // "09:00"
    endTime: varchar("end_time", { length: 5 }).notNull(),     // "18:00"
    slotDurationMinutes: integer("slot_duration_minutes").notNull().default(60),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => ({
    artistIdIdx: index("availability_rules_artist_id_idx").on(t.artistId),
  })
);

export const availabilityOverrides = pgTable(
  "availability_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    isBlocked: boolean("is_blocked").notNull().default(false),
    customSlots: jsonb("custom_slots").$type<{ start: string; end: string }[]>(),
    reason: varchar("reason", { length: 500 }),
  },
  (t) => ({
    artistDateIdx: uniqueIndex("availability_overrides_artist_date_idx").on(t.artistId, t.date),
  })
);

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => users.id),
    artistId: uuid("artist_id").notNull().references(() => artistProfiles.id),
    studioId: uuid("studio_id").references(() => studios.id),
    status: bookingStatusEnum("status").notNull().default("pending"),
    serviceType: serviceTypeEnum("service_type").notNull(),
    startAt: timestamp("start_at").notNull(),
    endAt: timestamp("end_at").notNull(),
    description: text("description").notNull(),
    referenceImages: text("reference_images").array().notNull().default([]),
    estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
    depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
    depositPaidAt: timestamp("deposit_paid_at"),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    artistNote: text("artist_note"),
    cancellationReason: text("cancellation_reason"),
    cancelledBy: uuid("cancelled_by").references(() => users.id),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    clientIdIdx: index("bookings_client_id_idx").on(t.clientId),
    artistIdIdx: index("bookings_artist_id_idx").on(t.artistId),
    statusIdx: index("bookings_status_idx").on(t.status),
    startAtIdx: index("bookings_start_at_idx").on(t.startAt),
  })
);

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => users.id),
    content: text("content").notNull(),
    attachments: text("attachments").array().notNull().default([]),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    bookingIdIdx: index("messages_booking_id_idx").on(t.bookingId),
    senderIdIdx: index("messages_sender_id_idx").on(t.senderId),
  })
);

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").notNull().references(() => bookings.id).unique(),
    clientId: uuid("client_id").notNull().references(() => users.id),
    artistId: uuid("artist_id").notNull().references(() => artistProfiles.id),
    rating: integer("rating").notNull(), // 1–5
    body: text("body"),
    artistReply: text("artist_reply"),
    isFlagged: boolean("is_flagged").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    artistIdIdx: index("reviews_artist_id_idx").on(t.artistId),
    ratingIdx: index("reviews_rating_idx").on(t.rating),
  })
);

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").notNull().references(() => bookings.id).unique(),
    artistId: uuid("artist_id").notNull().references(() => artistProfiles.id),
    clientId: uuid("client_id").notNull().references(() => users.id),
    lineItems: jsonb("line_items").notNull().$type<{ description: string; amount: number }[]>(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
    pdfUrl: varchar("pdf_url", { length: 1000 }),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
  }
);

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("notifications_user_id_idx").on(t.userId),
    readAtIdx: index("notifications_read_at_idx").on(t.readAt),
  })
);

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
    tier: subscriptionTierEnum("tier").notNull(),
    status: subscriptionStatusEnum("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  artistProfile: one(artistProfiles, { fields: [users.id], references: [artistProfiles.id] }),
  clientBookings: many(bookings, { relationName: "clientBookings" }),
  subscription: one(subscriptions, { fields: [users.id], references: [subscriptions.userId] }),
  notifications: many(notifications),
}));

export const artistProfilesRelations = relations(artistProfiles, ({ one, many }) => ({
  user: one(users, { fields: [artistProfiles.id], references: [users.id] }),
  portfolio: many(portfolioItems),
  bookings: many(bookings, { relationName: "artistBookings" }),
  availabilityRules: many(availabilityRules),
  availabilityOverrides: many(availabilityOverrides),
  reviews: many(reviews),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(users, { fields: [bookings.clientId], references: [users.id], relationName: "clientBookings" }),
  artist: one(artistProfiles, { fields: [bookings.artistId], references: [artistProfiles.id], relationName: "artistBookings" }),
  studio: one(studios, { fields: [bookings.studioId], references: [studios.id] }),
  messages: many(messages),
  review: one(reviews, { fields: [bookings.id], references: [reviews.bookingId] }),
  invoice: one(invoices, { fields: [bookings.id], references: [invoices.bookingId] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, { fields: [reviews.bookingId], references: [bookings.id] }),
  client: one(users, { fields: [reviews.clientId], references: [users.id] }),
  artist: one(artistProfiles, { fields: [reviews.artistId], references: [artistProfiles.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  booking: one(bookings, { fields: [messages.bookingId], references: [bookings.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

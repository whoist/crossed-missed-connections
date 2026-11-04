import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  alias: text("alias").notNull(),
  adult: integer("adult").notNull(),
  created: integer("created").notNull(),
});
export const encounters = sqliteTable(
  "encounters",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    title: text("title").notNull(),
    story: text("story").notNull(),
    place: text("place").notNull(),
    city: text("city").notNull(),
    category: text("category").notNull(),
    lat: real("lat").notNull(),
    lon: real("lon").notNull(),
    happened: text("happened").notNull(),
    created: integer("created").notNull(),
    status: text("status").notNull().default("active"),
  },
  (t) => [
    index("encounters_created").on(t.created),
    index("encounters_owner").on(t.owner),
  ],
);
export const threads = sqliteTable(
  "threads",
  {
    id: text("id").primaryKey(),
    encounter: text("encounter").notNull(),
    owner: text("owner").notNull(),
    respondent: text("respondent").notNull(),
    created: integer("created").notNull(),
  },
  (t) => [uniqueIndex("thread_pair").on(t.encounter, t.respondent)],
);
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    thread: text("thread").notNull(),
    sender: text("sender").notNull(),
    body: text("body").notNull(),
    created: integer("created").notNull(),
  },
  (t) => [index("messages_thread").on(t.thread, t.created)],
);
export const saved = sqliteTable(
  "saved",
  { user: text("user").notNull(), encounter: text("encounter").notNull() },
  (t) => [uniqueIndex("saved_pair").on(t.user, t.encounter)],
);
export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    user: text("user").notNull(),
    encounter: text("encounter").notNull(),
    reason: text("reason").notNull(),
    created: integer("created").notNull(),
  },
  (t) => [uniqueIndex("report_pair").on(t.user, t.encounter)],
);
export const blocks = sqliteTable(
  "blocks",
  { user: text("user").notNull(), blocked: text("blocked").notNull() },
  (t) => [uniqueIndex("block_pair").on(t.user, t.blocked)],
);
export const limits = sqliteTable("limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});

export const accounts = sqliteTable("accounts", {
  userId: text("user_id").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  recoveryHash: text("recovery_hash").notNull(),
  created: integer("created").notNull(),
}, t => [uniqueIndex("accounts_username").on(t.username)]);
export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  expires: integer("expires").notNull(),
}, t => [index("sessions_user").on(t.userId), index("sessions_expiry").on(t.expires)]);

import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { boards } from "./boards.js";
import { profiles } from "./profiles.js";

export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id").references(() => boards.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => profiles.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

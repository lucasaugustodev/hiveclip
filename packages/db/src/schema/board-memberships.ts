import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { boards } from "./boards.js";
import { profiles } from "./profiles.js";

export const boardMemberships = pgTable(
  "board_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    role: text("role").default("member"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique().on(t.boardId, t.userId)],
);

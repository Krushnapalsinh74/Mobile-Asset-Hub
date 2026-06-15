import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  email:        text("email").primaryKey(),
  name:         text("name"),
  boardId:      text("board_id"),
  boardName:    text("board_name"),
  standardId:   text("standard_id"),
  standardName: text("standard_name"),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ updatedAt: true });
export const upsertUserSchema = insertUserSchema.partial().required({ email: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

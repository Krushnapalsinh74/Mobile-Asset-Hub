import { pgTable, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const plansTable = pgTable("plans", {
  id:              text("id").primaryKey(),
  name:            text("name").notNull(),
  price:           integer("price").notNull(), // Base price in INR
  promoCode:       text("promo_code"),
  discountPercent: integer("discount_percent").default(0).notNull(),
  questionLimit:   integer("question_limit").notNull(),
});

export const insertPlanSchema = createInsertSchema(plansTable);
export type Plan = typeof plansTable.$inferSelect;

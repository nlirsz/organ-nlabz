import { pgTable, text, serial, integer, boolean, decimal, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  price: text("price"),
  originalPrice: text("original_price"),
  imageUrl: text("image_url"),
  store: text("store"),
  description: text("description"),
  category: text("category"),
  brand: text("brand"),
  tags: text("tags"),
  isPurchased: boolean("is_purchased").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  bank: text("bank").notNull(),
  installments: integer("installments").notNull(),
  installmentValue: real("installment_value").notNull(),
  totalValue: real("total_value").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  firstDueDate: text("first_due_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const installments = pgTable("installments", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "cascade" }).notNull(),
  installmentNumber: integer("installment_number").notNull(),
  dueDate: text("due_date").notNull(),
  value: real("value").notNull(),
  isPaid: boolean("is_paid").default(false),
  paidDate: text("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  user: one(users, {
    fields: [products.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.number().default(1),
});

export const updateProductSchema = insertProductSchema.partial();

export const insertPaymentSchema = z.object({
  productId: z.number(),
  paymentMethod: z.enum(["credito", "debito", "pix", "boleto", "dinheiro"]),
  bank: z.string().min(1),
  installments: z.number().min(1).max(48),
  installmentValue: z.number().positive(),
  totalValue: z.number().positive(),
  purchaseDate: z.string(),
  firstDueDate: z.string(),
});

export type Payment = z.infer<typeof insertPaymentSchema>;

export const installmentSchema = z.object({
  id: z.number(),
  paymentId: z.number(),
  installmentNumber: z.number(),
  dueDate: z.string(),
  value: z.number(),
  isPaid: z.boolean().default(false),
  paidDate: z.string().nullable(),
});

export type Installment = z.infer<typeof installmentSchema>;
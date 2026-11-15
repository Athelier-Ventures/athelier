import { z } from "zod";

const required = z.string().trim().min(1).max(180);
const money = z.number().int().nonnegative().safe().max(2_000_000_000);
const lines = z.array(z.enum(["reposteria", "personalizaciones", "fotografia"])).min(1).max(3);
const positive = z.number().positive().finite().max(1_000_000);
const id = z.string().min(1).max(200);

export const inputSchemas = {
  suppliers: z.object({
    name: required, active: z.boolean().default(true),
  }).strict(),
  materials: z.object({
    name: required, baseUnit: z.enum(["sheet", "piece", "gram", "millilitre", "centimetre"]),
    lines, active: z.boolean().default(true),
  }).strict(),
  presentations: z.object({
    materialId: id, name: required, unitsPerPackage: positive,
  }).strict(),
  purchases: z.object({
    presentationId: id, supplierId: id,
    purchasedAt: z.iso.datetime({ offset: true }),
    packages: positive,
    amountCents: money, taxCents: money,
    costScope: z.enum(["wholePurchase", "perPackage"]), currency: z.literal("MXN"),
  }).strict(),
  products: z.object({
    title: required, description: z.string().max(1500).default(""),
    imageUrl: z.union([z.url({ protocol: /^https$/ }), z.literal("")]).default(""),
    basePriceCents: money,
    currency: z.literal("MXN"),
    lineIds: lines,
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    optionGroups: z.array(z.object({
      id: id, title: required,
      selection: z.enum(["single", "multiple"]), required: z.boolean(),
      minSelections: z.number().int().nonnegative().max(100).optional(),
      maxSelections: z.number().int().nonnegative().max(100).optional(),
      options: z.array(z.object({
        id, label: required, priceCents: money,
        pricingMode: z.enum(["fixed", "perUnit"]),
      }).strict()).min(1).max(50),
    }).strict()).max(50),
    baseMaterials: z.array(z.object({
      materialId: id, unitsConsumed: positive,
      wastageRate: z.number().min(0).max(0.95).optional(),
    }).strict()).max(150),
  }).strict(),
} as const;

export type Resource = keyof typeof inputSchemas;
export const isResource = (value: string): value is Resource => Object.prototype.hasOwnProperty.call(inputSchemas, value);
export function validateInput(resource: Resource, value: unknown): Record<string, unknown> {
  const result = inputSchemas[resource].safeParse(value);
  if (!result.success) throw new Error(result.error.issues.map(i => i.path.join(".") + ": " + i.message).slice(0, 5).join("; "));
  return result.data as Record<string, unknown>;
}

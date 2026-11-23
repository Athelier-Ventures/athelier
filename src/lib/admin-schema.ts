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
  units: z.object({
    name: required, symbol: z.string().trim().min(1).max(30),
    kind: z.enum(["base", "derived"]), baseUnitId: id.optional(),
    unitsPerUnit: positive, active: z.boolean().default(true),
  }).strict().superRefine((data, ctx) => {
    if (data.kind === "base" && (data.baseUnitId || data.unitsPerUnit !== 1))
      ctx.addIssue({ code: "custom", message: "La unidad base equivale a 1 de sí misma." });
    if (data.kind === "derived" && !data.baseUnitId)
      ctx.addIssue({ code: "custom", message: "Selecciona la unidad base de equivalencia." });
  }),
  materials: z.object({
    name: required, baseUnit: z.enum(["sheet", "piece", "gram", "millilitre", "centimetre"]).optional(),
    baseUnitId: id.optional(), lines, active: z.boolean().default(true),
  }).strict().refine(data => Boolean(data.baseUnit || data.baseUnitId), "Selecciona una unidad base."),
  presentations: z.object({
    materialId: id, name: required, unitsPerPackage: positive,
    unitId: id.optional(), active: z.boolean().default(true),
  }).strict(),
  purchases: z.object({
    presentationId: id, supplierId: id,
    purchasedAt: z.iso.datetime({ offset: true }),
    packages: positive,
    grossCents: money, vatTreatment: z.enum(["standard", "zero", "exempt"]).default("standard"),
    costScope: z.enum(["wholePurchase", "perPackage"]), currency: z.literal("MXN"),
  }).strict(),
  products: z.object({
    title: required, description: z.string().max(1500).default(""),
    imageUrl: z.union([z.url({ protocol: /^https$/ }), z.string().regex(/^\/api\/catalog\/images\/[0-9a-f-]{36}$/i), z.literal("")]).default(""),
    allowBasePurchase: z.boolean().default(false),
    photoSlots: z.array(z.object({ id, label: required, maxFiles: z.number().int().min(1).max(10) }).strict()).max(10).default([]),
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

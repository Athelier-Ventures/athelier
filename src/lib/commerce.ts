/**
 * Athelier commerce domain (V0.4.1 Mexico).
 * Pure domain types/calculations only. No seeded business data, auth bypasses,
 * Firestore writes or customer-facing prices are introduced in this release.
 * Currency stored as integer minor units (cents) to prevent floating-point drift.
 */
import type { LineId } from "./brand";

export type Id = string;
export type MoneyCents = number;
export type BaseUnit = "sheet" | "piece" | "gram" | "millilitre" | "centimetre";

/** User-defined base unit or a derived purchasing unit, e.g. 1 pack = 100 sheets. */
export interface CatalogUnit {
  id: Id;
  name: string;
  symbol: string;
  kind: "base" | "derived";
  baseUnitId?: Id;
  unitsPerUnit: number;
  active: boolean;
}
export type PurchaseCostScope = "wholePurchase" | "perPackage";

export interface Supplier {
  id: Id;
  name: string;
  active: boolean;
}

export interface Material {
  id: Id;
  name: string;
  baseUnit?: BaseUnit; // Legacy units prior to configurable catalog
  baseUnitId?: Id; // Preferred: references CatalogUnit where kind === "base"
  lines: LineId[]; // tags, not automatic assignment to a product
  active: boolean;
}

export interface MaterialPresentation {
  id: Id;
  materialId: Id;
  name: string; // e.g. ream, box, roll
  unitsPerPackage: number; // e.g. 1000 sheets per ream
  unitId?: Id; // Optional reference to a user-defined derived CatalogUnit
  active?: boolean;
}

export interface Purchase {
  id: Id;
  materialId: Id;
  presentationId: Id;
  supplierId: Id;
  purchasedAt: string; // ISO 8601
  packages: number;
  unitsPerPackageSnapshot: number; // immutable historical quantity
  unitIdSnapshot?: Id | null;
  presentationNameSnapshot?: string;
  grossCents?: MoneyCents; // gross price actually paid, populated on new purchases
  vatTreatment?: "standard" | "zero" | "exempt"; // recorded tax treatment on new purchases
  amountCents: MoneyCents; // net of tax; historical records retain original value
  taxCents: MoneyCents;
  costScope: PurchaseCostScope; // whole purchase or each package
  currency: "MXN";
}

export type PricingMode = "fixed" | "perUnit";
export interface ProductOption {
  id: Id;
  label: string;
  priceCents: MoneyCents;
  pricingMode: PricingMode;
}
export interface ProductOptionGroup {
  id: Id;
  title: string;
  selection: "single" | "multiple";
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
  options: ProductOption[];
}
export interface BillOfMaterialsLine {
  materialId: Id;
  unitsConsumed: number;
  wastageRate?: number; // 0 to 1
}
export interface PhotoSlot {
  id: Id;
  label: string;
  maxFiles: number;
}
export interface CommercialProduct {
  /** Enables the base item with no optional additions without bypassing required groups for other products. */
  allowBasePurchase?: boolean;
  photoSlots?: PhotoSlot[];
  id: Id;
  title: string;
  basePriceCents: MoneyCents;
  currency: "MXN";
  lineIds: LineId[];
  status: "draft" | "published" | "archived";
  optionGroups: ProductOptionGroup[];
  baseMaterials: BillOfMaterialsLine[];
}
export interface ConfiguredChoice { groupId: Id; optionId: Id; units?: number }
export interface CartLineSnapshot {
  /** File bytes remain private in this browser pending a secure order submission backend. */
  photoAttachments?: Array<{ id: string; slotId: string; slotLabel: string; fileName: string }>;
  id: Id;
  productId: Id;
  productTitle: string;
  selections: ConfiguredChoice[];
  unitPriceCents: MoneyCents;
  quantity: number;
  currency: "MXN";
  // Immutable snapshot: later catalog edits never silently change an order.
}

function validNonnegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(field + " must be nonnegative and finite");
  return value;
}
function validInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(field + " must be a nonnegative safe integer");
  return value;
}

export function purchaseUnitCount(purchase: Purchase): number {
  const packages = validNonnegative(purchase.packages, "packages");
  const units = validNonnegative(purchase.unitsPerPackageSnapshot, "unitsPerPackageSnapshot");
  const result = packages * units;
  if (!Number.isFinite(result) || result <= 0) throw new Error("Purchase must contain positive units");
  return result;
}
export function purchaseTotalCostCents(purchase: Purchase, includeTax = false): number {
  const factor = purchase.costScope === "perPackage" ? purchase.packages : 1;
  validNonnegative(factor, "packages");
  const subtotal = validInteger(purchase.amountCents, "amountCents") * factor;
  const taxes = includeTax ? validInteger(purchase.taxCents, "taxCents") * factor : 0;
  const total = subtotal + taxes;
  if (!Number.isSafeInteger(total)) throw new Error("Cost overflow");
  return total;
}

/** Weighted unit cost for a material over a date range. No price overwrites. */
export function weightedUnitCost(
  purchases: Purchase[],
  materialId: Id,
  range?: { from?: string; to?: string; includeTax?: boolean }
): number | null {
  const lots = purchases.filter((p) =>
    p.materialId === materialId &&
    (!range?.from || p.purchasedAt >= range.from) &&
    (!range?.to || p.purchasedAt <= range.to)
  );
  if (!lots.length) return null;
  const units = lots.reduce((sum, p) => sum + purchaseUnitCount(p), 0);
  const cents = lots.reduce((sum, p) => sum + purchaseTotalCostCents(p, range?.includeTax ?? false), 0);
  return cents / units;
}

/** Sales prices are decided by the owner, not derived from material costs. */
/** Existing standard notebook is eligible without a data migration. Explicit false in Firestore overrides the legacy default. */
/** Default image sections for the pre-existing standard notebook. An explicit empty array disables this. */
export function photoSlotsForProduct(product: {title:string;photoSlots?:PhotoSlot[]}): PhotoSlot[] {
  if(Array.isArray(product.photoSlots))return product.photoSlots;
  const name=product.title.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(name!=="libreta personalizada estandar")return [];
  return [
    {id:"standard-notebook-cover",label:"Portada",maxFiles:1},
    {id:"standard-notebook-back",label:"Contraportada",maxFiles:1},
    {id:"standard-notebook-inner",label:"Hojas interiores",maxFiles:8},
  ];
}
export function permitsBasePurchase(product: Pick<CommercialProduct,"title"|"allowBasePurchase">): boolean {
  if(product.allowBasePurchase===true)return true;
  if(product.allowBasePurchase===false)return false;
  return product.title.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()==="libreta personalizada estandar";
}
/** 8 physical discs maximum per standard notebook, shared between pink and blue. */
export const STANDARD_NOTEBOOK_DISC_LIMIT = 8;

function normalizeNotebookText(text: string): string {
  return text.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
export function isStandardNotebookDiscOption(
  product: Pick<CommercialProduct,"title">,
  option: Pick<ProductOption,"label"|"pricingMode">
): boolean {
  return normalizeNotebookText(product.title)==="libreta personalizada estandar"
    && option.pricingMode==="perUnit"
    && /^discos?\s+(?:color\s+)?(?:rosa|azul)$/.test(normalizeNotebookText(option.label));
}
export function notebookDiscQuota(
  product: Pick<CommercialProduct,"title"|"optionGroups">,
  choices: ConfiguredChoice[]
): { selected:number; remaining:number; maximum:number } | null {
  const discs=product.optionGroups.flatMap(group=>group.options
    .filter(option=>isStandardNotebookDiscOption(product,option))
    .map(option=>group.id+":"+option.id));
  if(!discs.length)return null;
  const discIds=new Set(discs);
  const selected=choices.reduce((total,choice)=>
    total+(discIds.has(choice.groupId+":"+choice.optionId)?(choice.units??1):0),0);
  return {selected,remaining:STANDARD_NOTEBOOK_DISC_LIMIT-selected,maximum:STANDARD_NOTEBOOK_DISC_LIMIT};
}

export function configuredUnitPriceCents(product: CommercialProduct, choices: ConfiguredChoice[]): number {
  // Only products explicitly enabled by their owner can be purchased without any additions.
  // Selecting any option restores the normal required-group validation.
  const baseOnly = choices.length === 0 && permitsBasePurchase(product);
  let total = validInteger(product.basePriceCents, "basePriceCents");
  const groups = new Map(product.optionGroups.map((group) => [group.id, group]));
  const selectionCount = new Map<string, number>();
  const visited = new Set<string>();
  for (const choice of choices) {
    const group = groups.get(choice.groupId);
    if (!group) throw new Error("Unknown configuration group");
    const option = group.options.find((item) => item.id === choice.optionId);
    if (!option) throw new Error("Unknown configuration option");
    const key = choice.groupId + ":" + choice.optionId;
    if (visited.has(key)) throw new Error("Duplicate option");
    visited.add(key);
    const count = (selectionCount.get(group.id) ?? 0) + 1;
    selectionCount.set(group.id, count);
    const units = option.pricingMode === "perUnit" ? validInteger(choice.units ?? 1, "units") : 1;
    if(isStandardNotebookDiscOption(product,option) && (units<1 || units>STANDARD_NOTEBOOK_DISC_LIMIT))
      throw new Error("DISC_LIMIT_EXCEEDED: each disc colour must contain between 1 and 8 discs");
    total += validInteger(option.priceCents, "priceCents") * units;
  }
  const discQuota=notebookDiscQuota(product,choices);
  if(discQuota && (!Number.isSafeInteger(discQuota.selected) || discQuota.selected>discQuota.maximum))
    throw new Error("DISC_LIMIT_EXCEEDED: maximum 8 discs per notebook");
  for (const group of product.optionGroups) {
    const count = selectionCount.get(group.id) ?? 0;
    // The owner may allow a standard base product while keeping e.g. "Tipo de hojas" required.
    // Only explicitly named add-on groups become optional when standard purchase is enabled.
    const addonGroup = /^(adicionales?|extras?|complementos?|secciones)$/i.test(group.title.trim());
    const min = permitsBasePurchase(product) && addonGroup ? 0 : Math.max(group.required ? 1 : 0, group.minSelections ?? 0);
    const max = Math.min(group.selection === "single" ? 1 : Infinity, group.maxSelections ?? Infinity);
    if ((!baseOnly && count < min) || count > max) throw new Error("Invalid option count: " + group.id);
  }
  if (!Number.isSafeInteger(total)) throw new Error("Price overflow");
  return total;
}
export function materialCostEstimateCents(
  recipe: BillOfMaterialsLine[],
  unitCosts: Readonly<Record<Id, number>>
): number | null {
  let result = 0;
  for (const part of recipe) {
    const unitCost = unitCosts[part.materialId];
    if (unitCost === undefined) return null;
    const loss = part.wastageRate ?? 0;
    if (!Number.isFinite(loss) || loss < 0 || loss >= 1) throw new Error("Invalid wastage rate");
    result += validNonnegative(part.unitsConsumed, "unitsConsumed") / (1 - loss) * validNonnegative(unitCost, "unitCost");
  }
  return Math.round(result);
}

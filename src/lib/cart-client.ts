"use client";

import type { CartLineSnapshot, ConfiguredChoice, CommercialProduct } from "@/lib/commerce";
import { configuredUnitPriceCents } from "@/lib/commerce";

const STORAGE_KEY = "athelier:global-cart:v1";

export type PublicProduct = Pick<CommercialProduct, "id" | "title" | "basePriceCents" | "optionGroups" | "lineIds"> & {
  description?: string;
  imageUrl?: string;
  currency: "MXN";
};
export type CartItem = CartLineSnapshot & { optionLabels: string[] };

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((i): i is CartItem => typeof i === "object" && !!i &&
      typeof i.id === "string" && typeof i.productTitle === "string" &&
      typeof i.unitPriceCents === "number" && Number.isSafeInteger(i.unitPriceCents) &&
      typeof i.quantity === "number" && Number.isSafeInteger(i.quantity) && i.quantity > 0 &&
      i.currency === "MXN" && Array.isArray(i.optionLabels));
  } catch { return []; }
}
export function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("athelier-cart-changed"));
}
export function addConfiguredProduct(product: PublicProduct, choices: ConfiguredChoice[], quantity: number): CartItem {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 1000) throw new Error("Cantidad no válida");
  const unitPriceCents = configuredUnitPriceCents({
    ...product,
    description: product.description,
    status: "published",
    currency: "MXN",
    baseMaterials: [],
  } as CommercialProduct, choices);
  const optionLabels = choices.map(choice => {
    const option = product.optionGroups.find(g => g.id === choice.groupId)?.options.find(o => o.id === choice.optionId);
    return option ? option.label + (choice.units && choice.units > 1 ? " × " + choice.units : "") : "";
  }).filter(Boolean);
  const item: CartItem = {
    id: crypto.randomUUID(), productId: product.id, productTitle: product.title,
    selections: choices, optionLabels, unitPriceCents, quantity, currency: "MXN"
  };
  saveCart([...loadCart(), item]);
  return item;
}

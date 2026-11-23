"use client";

import type { CartLineSnapshot, ConfiguredChoice, CommercialProduct, PhotoSlot } from "@/lib/commerce";
import type { PhotoReference } from "@/lib/private-cart-photos";
import { configuredUnitPriceCents } from "@/lib/commerce";

const STORAGE_KEY = "athelier:global-cart:v1";

export type PublicProduct = Pick<CommercialProduct, "id" | "title" | "basePriceCents" | "optionGroups" | "lineIds"> & {
  description?: string;
  imageUrl?: string;
  galleryImageUrls?: string[];
  currency: "MXN";
  allowBasePurchase?: boolean;
  photoSlots?: PhotoSlot[];
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
export function addConfiguredProduct(product: PublicProduct, choices: ConfiguredChoice[], quantity: number, photoAttachments: PhotoReference[] = [], id: string = crypto.randomUUID()): CartItem {
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
    id, productId: product.id, productTitle: product.title,
    selections: choices, optionLabels, unitPriceCents, quantity, currency: "MXN", photoAttachments
  };
  saveCart([...loadCart(), item]);
  return item;
}


/** Recalculate a cart item using the currently published product rules without changing its identity. */
export function reviseConfiguredCartItem(
  original: CartItem,
  product: PublicProduct,
  choices: ConfiguredChoice[],
  quantity: number,
  photoAttachments: PhotoReference[] = original.photoAttachments ?? [],
): CartItem {
  if (product.id !== original.productId) throw new Error("Producto incorrecto");
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000)
    throw new Error("La cantidad debe estar entre 1 y 1000.");
  for (const choice of choices) {
    if (choice.units !== undefined && (!Number.isSafeInteger(choice.units) || choice.units < 1 || choice.units > 1000))
      throw new Error("La cantidad de cada adicional debe estar entre 1 y 1000.");
  }
  const unitPriceCents = configuredUnitPriceCents({
    ...product, status: "published", baseMaterials: [],
  } as CommercialProduct, choices);
  if (!Number.isSafeInteger(unitPriceCents * quantity))
    throw new Error("El subtotal es demasiado grande.");
  const optionLabels = choices.map(choice => {
    const option = product.optionGroups.find(group => group.id === choice.groupId)?.options.find(x => x.id === choice.optionId);
    if (!option) throw new Error("La opción seleccionada ya no está disponible.");
    return option.label + (option.pricingMode === "perUnit" && (choice.units ?? 1) > 1 ? " × " + choice.units : "");
  });
  return {
    ...original,
    productTitle: product.title,
    selections: choices.map(choice => ({ ...choice })),
    optionLabels, unitPriceCents, quantity,
    photoAttachments,
  };
}

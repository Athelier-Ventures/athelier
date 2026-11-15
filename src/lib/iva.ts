/** Mexico: standard-rate IVA included in the displayed amount, never added on top.
 * Figures are integer centavos. Tax treatment is explicitly captured per purchase.
 */
export const IVA_RATE = 0.16 as const;
export type VatTreatment = "standard" | "zero" | "exempt";
export function inclusiveTaxBreakdown(grossCents: number, treatment: VatTreatment = "standard") {
  if (!Number.isSafeInteger(grossCents) || grossCents < 0) throw new Error("El importe debe expresarse en centavos no negativos");
  if (treatment === "zero" || treatment === "exempt") return { grossCents, netCents: grossCents, taxCents: 0 };
  if (treatment !== "standard") throw new Error("Tratamiento de IVA desconocido");
  const netCents = Math.round(grossCents / (1 + IVA_RATE));
  return { grossCents, netCents, taxCents: grossCents - netCents };
}

import bundled from "../public/equipment-catalogue.json";
import { parseCatalogue, type Product } from "./equipment";
import { getJson } from "./weather";
export const CATALOGUE_URL =
  "https://raw.githubusercontent.com/brownie-au/offgrid-mate/feature/weather-equipment-catalogue/public/equipment-catalogue.json";
const KEY = "offgrid-mate:catalogue:v1";
export function readCatalogue(): { products: Product[]; updatedAt?: string } {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    if (c) return { products: parseCatalogue(c), updatedAt: c.checkedAt };
  } catch {
    /* retain bundled verified catalogue */
  }
  return { products: parseCatalogue(bundled) };
}
export async function refreshCatalogue(
  request = getJson,
): Promise<{ products: Product[]; updatedAt: string }> {
  const r = await request(CATALOGUE_URL);
  if (r.status !== 200)
    throw new Error(
      "Catalogue refresh unavailable. Bundled/cached products remain usable.",
    );
  const products = parseCatalogue(r.data);
  const updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ schema: 1, products, checkedAt: updatedAt }),
    );
  } catch {
    throw new Error(
      "Catalogue downloaded but could not be saved. Existing products remain available.",
    );
  }
  return { products, updatedAt };
}

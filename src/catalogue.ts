import bundled from "../public/equipment-catalogue.json";
import { parseCatalogue, type Product } from "./equipment";
import { getJson } from "./weather";
export const CATALOGUE_URL =
  "https://raw.githubusercontent.com/brownie-au/offgrid-mate/feature/weather-equipment-catalogue/public/equipment-catalogue.json";
const KEY = "offgrid-mate:catalogue:v1";
// Older app versions cached only the product array. A revision prevents that
// small cache from masking a newer bundled catalogue, including while offline.
function revision(value: unknown): number {
  const r = (value as { revision?: unknown } | null)?.revision;
  if (r === undefined) return 0;
  if (typeof r !== "number" || !Number.isSafeInteger(r) || r < 0)
    throw new Error("Invalid catalogue revision.");
  return r;
}
export function readCatalogue(): { products: Product[]; updatedAt?: string } {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    if (c && revision(c) >= revision(bundled))
      return { products: parseCatalogue(c), updatedAt: c.checkedAt };
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
  const nextRevision = revision(r.data);
  let cachedRevision = revision(bundled);
  try {
    const cached = JSON.parse(localStorage.getItem(KEY) || "null");
    if (cached) {
      parseCatalogue(cached);
      cachedRevision = Math.max(cachedRevision, revision(cached));
    }
  } catch {
    /* invalid caches must not block a valid update */
  }
  if (nextRevision < cachedRevision)
    throw new Error(
      "An older catalogue was received. Newer offline products were kept.",
    );
  const updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        schema: 1,
        revision: nextRevision,
        products,
        checkedAt: updatedAt,
      }),
    );
  } catch {
    throw new Error(
      "Catalogue downloaded but could not be saved. Existing products remain available.",
    );
  }
  return { products, updatedAt };
}

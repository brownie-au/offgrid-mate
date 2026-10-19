import type { Appliance, Profile } from "./engine";
export type Category =
  | "fridge"
  | "lighting"
  | "communications"
  | "other"
  | "solar"
  | "dcdc"
  | "mains"
  | "inverter";
export type SourceSlot = "roof" | "blanket" | "dcdc" | "mains" | "inverter";
export type Product = {
  id: string;
  brand: string;
  model: string;
  category: Category;
  sourceUrl: string;
  verifiedAt: string;
  notes: string;
  watts?: number;
  amps?: number;
  voltage?: number;
  dailyWh?: number;
  idleW?: number;
  efficiency?: number;
  continuousW?: number;
  peakW?: number;
  shared?: boolean;
  priority?: "solar" | "combined";
  basis?: string;
};
export type EquipmentMeta = {
  brand?: string;
  model?: string;
  category?: Category;
  productId?: string;
  sourceUrl?: string;
  verifiedAt?: string;
  specNotes?: string;
  basis?: string;
  customId?: string;
  overridden?: boolean;
  dailyWh?: number;
  energyMethod?: "power" | "daily";
  inputVolts?: number;
  peakW?: number;
};
export type SourceEquipment = EquipmentMeta & {
  id: string;
  name: string;
  slot: SourceSlot;
  watts: number;
  amps: number;
  voltage: number;
  quantity: number;
  hours: number;
  start: number;
  idleW: number;
  efficiency: number;
  shared: boolean;
  priority: "solar" | "combined";
  sharedLimitA?: number;
  mpptLimitA?: number;
};
export type CustomTemplate = {
  id: string;
  name: string;
  category: Category;
  brand: string;
  model: string;
  watts: number;
  amps: number;
  voltage: number;
  quantity: number;
  hours: number;
  start: number;
  duty: number;
  ac: boolean;
  dailyWh: number;
  energyMethod: "power" | "daily";
  idleW: number;
  efficiency: number;
  slot: SourceSlot;
  shared: boolean;
  priority: "solar" | "combined";
  sharedLimitA?: number;
  mpptLimitA?: number;
};
export const categories: Record<Category, string> = {
  fridge: "Fridge / freezer",
  lighting: "Lighting",
  communications: "Communications",
  other: "Other appliance",
  solar: "Solar panel",
  dcdc: "DC-DC / MPPT charger",
  mains: "Mains / generator charger",
  inverter: "Inverter",
};
export const isSource = (category: Category) =>
  ["solar", "dcdc", "mains", "inverter"].includes(category);
const n = (x: unknown, lo = 0, hi = 50000) =>
  typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;
const string = (x: unknown, max = 500) =>
  typeof x === "string" && x.length <= max;
const https = (x: unknown) => {
  try {
    return typeof x === "string" && new URL(x).protocol === "https:";
  } catch {
    return false;
  }
};
export function validMeta(v: EquipmentMeta) {
  return (
    ["brand", "model", "productId", "customId", "basis"].every(
      (k) =>
        (v as Record<string, unknown>)[k] === undefined ||
        string((v as Record<string, unknown>)[k], 200),
    ) &&
    (v.category === undefined || Object.hasOwn(categories, v.category)) &&
    (v.sourceUrl === undefined || https(v.sourceUrl)) &&
    (v.verifiedAt === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v.verifiedAt)) &&
    (v.specNotes === undefined || string(v.specNotes, 2000)) &&
    (v.dailyWh === undefined || n(v.dailyWh, 0, 1_000_000)) &&
    (v.inputVolts === undefined || n(v.inputVolts, 0, 1000)) &&
    (v.peakW === undefined || n(v.peakW)) &&
    (v.energyMethod === undefined ||
      ["power", "daily"].includes(v.energyMethod)) &&
    (v.overridden === undefined || typeof v.overridden === "boolean")
  );
}
export function validSource(s: SourceEquipment) {
  return (
    !!s &&
    validMeta(s) &&
    string(s.id, 100) &&
    string(s.name, 80) &&
    s.name.length > 0 &&
    ["roof", "blanket", "dcdc", "mains", "inverter"].includes(s.slot) &&
    (s.sharedLimitA === undefined || n(s.sharedLimitA, 0, 1000)) &&
    (s.mpptLimitA === undefined || n(s.mpptLimitA, 0, 1000)) &&
    n(s.watts) &&
    n(s.amps, 0, 1000) &&
    n(s.voltage, 0, 1000) &&
    n(s.quantity, 1, 100) &&
    Number.isInteger(s.quantity) &&
    n(s.hours, 0, 24) &&
    n(s.start, 0, 23.75) &&
    n(s.idleW, 0, 500) &&
    n(s.efficiency, 0.1, 1) &&
    typeof s.shared === "boolean" &&
    ["solar", "combined"].includes(s.priority)
  );
}
export function validTemplate(v: CustomTemplate) {
  return (
    !!v &&
    validSource({ ...v, voltage: v.voltage }) &&
    Object.hasOwn(categories, v.category) &&
    string(v.brand, 80) &&
    string(v.model, 80) &&
    n(v.duty, 0, 1) &&
    typeof v.ac === "boolean" &&
    n(v.dailyWh, 0, 1_000_000) &&
    ["power", "daily"].includes(v.energyMethod)
  );
}
export function validProduct(v: Product) {
  return (
    !!v &&
    string(v.id, 100) &&
    v.id.length > 0 &&
    string(v.brand, 80) &&
    v.brand.length > 0 &&
    string(v.model, 150) &&
    v.model.length > 0 &&
    Object.hasOwn(categories, v.category) &&
    https(v.sourceUrl) &&
    typeof v.verifiedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.verifiedAt) &&
    Date.parse(v.verifiedAt) <= Date.now() + 86400000 &&
    string(v.notes, 2000) &&
    [
      "watts",
      "amps",
      "voltage",
      "dailyWh",
      "idleW",
      "continuousW",
      "peakW",
    ].every(
      (k) =>
        (v as Record<string, unknown>)[k] === undefined ||
        n(
          (v as Record<string, unknown>)[k],
          0,
          k === "dailyWh" ? 1_000_000 : 50000,
        ),
    ) &&
    (v.efficiency === undefined || n(v.efficiency, 0.1, 1)) &&
    (v.shared === undefined || typeof v.shared === "boolean") &&
    (v.priority === undefined || ["solar", "combined"].includes(v.priority))
  );
}
export function parseCatalogue(v: unknown): Product[] {
  const data = v as { schema: number; products: Product[] };
  if (
    data?.schema !== 1 ||
    !Array.isArray(data.products) ||
    data.products.length < 1 ||
    data.products.length > 5000 ||
    !data.products.every(validProduct) ||
    new Set(data.products.map((p) => p.id)).size !== data.products.length
  )
    throw new Error(
      "Catalogue update failed validation. Existing equipment has not changed.",
    );
  return data.products;
}
export function applySource(p: Profile, s: SourceEquipment): Profile {
  const nominal = p.voltage <= 16 ? 12 : p.voltage <= 30 ? 24 : 48;
  if (["dcdc", "mains", "inverter"].includes(s.slot) && s.voltage !== nominal)
    throw new Error(
      `This ${s.voltage} V equipment does not match your ${nominal} V battery system.`,
    );
  const equipment = [
    ...(p.equipment || []).filter((x) => x.slot !== s.slot),
    s,
  ];
  if (s.slot === "roof")
    return { ...p, roofW: s.watts * s.quantity, equipment };
  if (s.slot === "blanket")
    return { ...p, blanketW: s.watts * s.quantity, equipment };
  if (s.slot === "dcdc")
    return {
      ...p,
      dcdcA: s.amps * s.quantity,
      driveHours: s.hours,
      driveStart: s.start,
      shared: s.shared,
      sharedA: s.sharedLimitA ?? s.amps * s.quantity,
      ...(s.shared ? { mpptA: s.mpptLimitA ?? s.amps * s.quantity } : {}),
      chargerPriority: s.priority,
      equipment,
    };
  if (s.slot === "mains")
    return {
      ...p,
      acA: s.amps * s.quantity,
      acHours: s.hours,
      acStart: s.start,
      equipment,
    };
  return {
    ...p,
    inverterIdleW: s.idleW,
    inverterEfficiency: s.efficiency,
    equipment,
  };
}
export function removeSource(p: Profile, s: SourceEquipment): Profile {
  const equipment = (p.equipment || []).filter((x) => x.id !== s.id);
  if (s.slot === "roof") return { ...p, roofW: 0, equipment };
  if (s.slot === "blanket") return { ...p, blanketW: 0, equipment };
  if (s.slot === "dcdc")
    return {
      ...p,
      dcdcA: 0,
      driveHours: 0,
      ...(s.shared ? { mpptA: 0, sharedA: 0 } : {}),
      equipment,
    };
  if (s.slot === "mains") return { ...p, acA: 0, acHours: 0, equipment };
  return { ...p, inverterIdleW: 0, inverterEfficiency: 0.9, equipment };
}
export function toAppliance(
  t: CustomTemplate,
  meta: EquipmentMeta = {},
): Appliance {
  return {
    id: crypto.randomUUID(),
    name: t.name,
    category: t.category,
    brand: t.brand,
    model: t.model,
    watts: t.watts,
    hours: t.hours,
    start: t.start,
    duty: t.duty,
    quantity: t.quantity,
    ac: t.ac,
    enabled: true,
    energyMethod: t.energyMethod,
    dailyWh: t.dailyWh,
    inputVolts: t.voltage,
    ...meta,
  };
}

export function patchProfile(p: Profile, patch: Partial<Profile>): Profile {
  const next = { ...p, ...patch };
  return {
    ...next,
    equipment: next.equipment?.map((e) => {
      let values: Partial<SourceEquipment> = {};
      if (e.slot === "roof") values = { watts: next.roofW / e.quantity };
      if (e.slot === "blanket") values = { watts: next.blanketW / e.quantity };
      if (e.slot === "dcdc")
        values = {
          amps: next.dcdcA / e.quantity,
          hours: next.driveHours,
          start: next.driveStart,
          shared: next.shared,
          priority: next.chargerPriority || "combined",
          sharedLimitA: next.sharedA,
          mpptLimitA: next.mpptA,
        };
      if (e.slot === "mains")
        values = {
          amps: next.acA / e.quantity,
          hours: next.acHours,
          start: next.acStart,
        };
      if (e.slot === "inverter")
        values = {
          idleW: next.inverterIdleW,
          efficiency: next.inverterEfficiency,
        };
      const changed = Object.entries(values).some(
        ([key, value]) =>
          (e as Record<string, unknown>)[key] !== value &&
          !(
            (key === "sharedLimitA" || key === "mpptLimitA") &&
            (e as Record<string, unknown>)[key] === undefined
          ),
      );
      return { ...e, ...values, overridden: e.overridden || changed };
    }),
  };
}

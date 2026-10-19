import {
  weatherFactors,
  weatherForDay,
  validWeatherSettings,
  type Weather,
  type WeatherSettings,
} from "./weather";
import {
  validMeta,
  validSource,
  type EquipmentMeta,
  type SourceEquipment,
} from "./equipment";
export { weatherFactors };
export type { Weather };
export type Appliance = EquipmentMeta & {
  id: string;
  name: string;
  watts: number;
  hours: number;
  start: number;
  duty: number;
  quantity: number;
  ac: boolean;
  enabled: boolean;
};
export type Profile = {
  id: string;
  name: string;
  chemistry: "LiFePO4" | "AGM" | "Other";
  voltage: number;
  ah: number;
  soc: number;
  reserve: number;
  chargeVoltage: number;
  chargeEfficiency: number;
  inverterEfficiency: number;
  inverterIdleW: number;
  maxChargeA: number;
  roofW: number;
  blanketW: number;
  solarEfficiency: number;
  psh: number;
  mpptA: number;
  dcdcA: number;
  driveHours: number;
  driveStart: number;
  shared: boolean;
  sharedA: number;
  acSource: "mains" | "generator";
  acA: number;
  acHours: number;
  acStart: number;
  appliances: Appliance[];
  weather: Weather[];
  weatherSettings?: WeatherSettings;
  equipment?: SourceEquipment[];
  chargerPriority?: "combined" | "solar";
};
export const defaultProfile: Profile = {
  id: "savannah-x",
  name: "Savannah-X",
  chemistry: "LiFePO4",
  voltage: 12.8,
  ah: 600,
  soc: 100,
  reserve: 20,
  chargeVoltage: 14.4,
  chargeEfficiency: 0.95,
  inverterEfficiency: 0.9,
  inverterIdleW: 8,
  maxChargeA: 100,
  roofW: 200,
  blanketW: 300,
  solarEfficiency: 0.75,
  psh: 5,
  mpptA: 50,
  dcdcA: 30,
  driveHours: 0,
  driveStart: 9,
  shared: true,
  sharedA: 50,
  acSource: "mains",
  acA: 20,
  acHours: 0,
  acStart: 18,
  appliances: [
    {
      id: "fridge",
      name: "Camping fridge",
      watts: 35,
      hours: 24,
      start: 0,
      duty: 0.45,
      quantity: 1,
      ac: false,
      enabled: true,
    },
    {
      id: "starlink",
      name: "Starlink Mini",
      watts: 40,
      hours: 6,
      start: 9,
      duty: 1,
      quantity: 1,
      ac: false,
      enabled: true,
    },
    {
      id: "lights",
      name: "Camp lights",
      watts: 10,
      hours: 4,
      start: 18,
      duty: 1,
      quantity: 1,
      ac: false,
      enabled: true,
    },
    {
      id: "devices",
      name: "Phones & devices",
      watts: 20,
      hours: 2,
      start: 18,
      duty: 1,
      quantity: 1,
      ac: false,
      enabled: true,
    },
  ],
  weather: ["sunny", "sunny", "mixed", "overcast", "mixed", "sunny", "sunny"],
};
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
export function active(hour: number, start: number, hours: number) {
  return (hour - start + 24) % 24 < hours;
}
export function applianceWh(a: Appliance, p: Profile) {
  return a.enabled
    ? (a.energyMethod === "daily"
        ? (a.dailyWh || 0) * a.quantity
        : a.watts * a.hours * a.duty * a.quantity) /
        (a.ac ? p.inverterEfficiency : 1)
    : 0;
}
export function dailyLoad(p: Profile) {
  return (
    p.appliances.reduce((s, a) => s + applianceWh(a, p), 0) +
    Array.from({ length: 96 }, (_, i) => {
      const h = i / 4;
      return p.appliances.some(
        (a) => a.enabled && a.ac && active(h, a.start, a.hours),
      )
        ? p.inverterIdleW / 4
        : 0;
    }).reduce((a, b) => a + b, 0)
  );
}
export type Day = {
  day: number;
  soc: number;
  minSoc: number;
  solarWh: number;
  driveWh: number;
  acWh: number;
  loadWh: number;
  spilledWh: number;
  unservedWh: number;
  reserveCrossed: boolean;
};
export type Point = { hour: number; soc: number };
export function forecast(
  p: Profile,
  days = 7,
  now = new Date(),
): { days: Day[]; points: Point[]; firstReserveHour: number | null } {
  const capacity = p.voltage * p.ah;
  let energy = (capacity * p.soc) / 100;
  const points: Point[] = [{ hour: 0, soc: p.soc }],
    result: Day[] = [];
  let firstReserveHour: number | null = p.soc <= p.reserve ? 0 : null;
  // 15-minute deterministic simulation; starts at midnight. Solar sine integrates to PSH.
  const weights = Array.from({ length: 96 }, (_, i) =>
    Math.max(0, Math.sin((Math.PI * ((i + 0.5) / 4 - 6)) / 12)),
  );
  const weightHours = weights.reduce((a, b) => a + b, 0) / 4;
  for (let d = 0; d < days; d++) {
    const row: Day = {
      day: d + 1,
      soc: 0,
      minSoc: (energy / capacity) * 100,
      solarWh: 0,
      driveWh: 0,
      acWh: 0,
      loadWh: 0,
      spilledWh: 0,
      unservedWh: 0,
      reserveCrossed: false,
    };
    for (let i = 0; i < 96; i++) {
      const h = (i + 0.5) / 4;
      const sun =
        ((p.roofW + p.blanketW) *
          p.psh *
          p.solarEfficiency *
          weatherForDay(p.weatherSettings, p.weather, d, now).factor *
          weights[i]) /
        weightHours;
      let solar = Math.min(sun, p.mpptA * p.chargeVoltage);
      let drive = active(h, p.driveStart, p.driveHours)
        ? p.dcdcA * p.chargeVoltage
        : 0;
      if (p.shared && p.chargerPriority === "solar" && solar > 0) drive = 0;
      if (p.shared && solar + drive > p.sharedA * p.chargeVoltage) {
        const factor = (p.sharedA * p.chargeVoltage) / (solar + drive);
        solar *= factor;
        drive *= factor;
      }
      const ac = active(h, p.acStart, p.acHours) ? p.acA * p.chargeVoltage : 0;
      let load = p.appliances.reduce(
        (sum, a) =>
          sum +
          (a.enabled && active(h, a.start, a.hours)
            ? (a.energyMethod === "daily"
                ? ((a.dailyWh || 0) / Math.max(a.hours, 0.25)) * a.quantity
                : a.watts * a.duty * a.quantity) /
              (a.ac ? p.inverterEfficiency : 1)
            : 0),
        0,
      );
      if (
        p.appliances.some(
          (a) => a.enabled && a.ac && active(h, a.start, a.hours),
        )
      )
        load += p.inverterIdleW;
      const net = solar + drive + ac - load;
      if (net > 0) {
        const stored =
          Math.min(net, p.maxChargeA * p.chargeVoltage) *
          0.25 *
          p.chargeEfficiency;
        const accepted = Math.min(stored, capacity - energy);
        row.spilledWh += net * 0.25 - accepted / p.chargeEfficiency;
        energy += accepted;
      } else {
        const demand = -net * 0.25;
        row.unservedWh += Math.max(0, demand - energy);
        energy = Math.max(0, energy - demand);
      }
      row.solarWh += solar * 0.25;
      row.driveWh += drive * 0.25;
      row.acWh += ac * 0.25;
      row.loadWh += load * 0.25;
      const soc = (energy / capacity) * 100;
      row.minSoc = Math.min(row.minSoc, soc);
      if (soc <= p.reserve && firstReserveHour === null)
        firstReserveHour = d * 24 + (i + 1) / 4;
      points.push({ hour: d * 24 + (i + 1) / 4, soc });
    }
    row.soc = (energy / capacity) * 100;
    row.reserveCrossed = row.minSoc <= p.reserve;
    result.push(row);
  }
  return { days: result, points, firstReserveHour };
}
function num(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}
export function validProfile(v: unknown): v is Profile {
  if (!v || typeof v !== "object") return false;
  const p = v as Profile;
  const ranges: Record<string, [number, number]> = {
    voltage: [1, 100],
    ah: [1, 10000],
    soc: [0, 100],
    reserve: [0, 99],
    chargeVoltage: [1, 120],
    chargeEfficiency: [0.1, 1],
    inverterEfficiency: [0.1, 1],
    inverterIdleW: [0, 500],
    maxChargeA: [0, 1000],
    roofW: [0, 50000],
    blanketW: [0, 50000],
    solarEfficiency: [0, 1],
    psh: [0, 12],
    mpptA: [0, 1000],
    dcdcA: [0, 1000],
    driveHours: [0, 24],
    driveStart: [0, 23.75],
    sharedA: [0, 1000],
    acA: [0, 1000],
    acHours: [0, 24],
    acStart: [0, 23.75],
  };
  if (
    !Object.entries(ranges).every(([k, [lo, hi]]) =>
      num((p as unknown as Record<string, unknown>)[k], lo, hi),
    )
  )
    return false;
  return (
    (p.weatherSettings === undefined ||
      validWeatherSettings(p.weatherSettings)) &&
    (p.chargerPriority === undefined ||
      ["combined", "solar"].includes(p.chargerPriority)) &&
    (p.equipment === undefined ||
      (Array.isArray(p.equipment) &&
        p.equipment.length <= 5 &&
        p.equipment.every(validSource) &&
        new Set(p.equipment.map((e) => e.slot)).size === p.equipment.length)) &&
    typeof p.id === "string" &&
    p.id.length > 0 &&
    typeof p.name === "string" &&
    p.name.trim().length > 0 &&
    p.name.length <= 80 &&
    ["LiFePO4", "AGM", "Other"].includes(p.chemistry) &&
    typeof p.shared === "boolean" &&
    ["mains", "generator"].includes(p.acSource) &&
    Array.isArray(p.weather) &&
    p.weather.length === 7 &&
    p.weather.every((w) => Object.hasOwn(weatherFactors, w)) &&
    Array.isArray(p.appliances) &&
    p.appliances.length <= 100 &&
    new Set(p.appliances.map((a) => a.id)).size === p.appliances.length &&
    p.appliances.every(
      (a) =>
        a &&
        validMeta(a) &&
        (a.energyMethod !== "daily" ||
          (typeof a.dailyWh === "number" && a.hours > 0)) &&
        typeof a.id === "string" &&
        typeof a.name === "string" &&
        a.name.length > 0 &&
        a.name.length <= 80 &&
        num(a.watts, 0, 50000) &&
        num(a.hours, 0, 24) &&
        num(a.start, 0, 23.75) &&
        num(a.duty, 0, 1) &&
        num(a.quantity, 1, 100) &&
        typeof a.enabled === "boolean" &&
        typeof a.ac === "boolean",
    )
  );
}

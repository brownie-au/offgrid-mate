import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import tzlookup from "tz-lookup";
export type Weather = "sunny" | "mixed" | "overcast" | "rain";
export const weatherFactors: Record<Weather, number> = {
  sunny: 1,
  mixed: 0.65,
  overcast: 0.3,
  rain: 0.1,
};
export type ForecastLocation = {
  name: string;
  lat: number;
  lon: number;
  timezone: string;
};
export type WeatherDay = {
  date: string;
  cloud: number;
  minC: number;
  maxC: number;
  rainMm: number;
  factor: number;
  condition: Weather;
  hours: number;
};
export type WeatherCache = {
  location: ForecastLocation;
  fetchedAt: string;
  modelUpdatedAt: string;
  expiresAt: string;
  lastModified?: string;
  days: WeatherDay[];
};
export type WeatherSettings = {
  mode: "auto" | "manual";
  location?: ForecastLocation;
  cache?: WeatherCache;
};
export const MET_URL =
  "https://api.met.no/weatherapi/locationforecast/2.0/compact";
export const APP_AGENT =
  "OffGridMate/0.2 (+https://github.com/brownie-au/offgrid-mate)";
export const places = [
  ["Cairns", -16.9186, 145.7781],
  ["Port Douglas", -16.4833, 145.4667],
  ["Mareeba", -16.9973, 145.4231],
  ["Brisbane", -27.4698, 153.0251],
  ["Sydney", -33.8688, 151.2093],
  ["Melbourne", -37.8136, 144.9631],
  ["Adelaide", -34.9285, 138.6007],
  ["Perth", -31.9523, 115.8613],
  ["Darwin", -12.4634, 130.8456],
  ["Alice Springs", -23.698, 133.8807],
  ["Hobart", -42.8821, 147.3272],
  ["Tokyo", 35.6762, 139.6503],
] as const;
const finite = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const time = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
export function locationFrom(
  name: string,
  lat: number,
  lon: number,
): ForecastLocation {
  if (!name.trim() || !finite(lat, -90, 90) || !finite(lon, -180, 180))
    throw new Error("Enter a location name and valid latitude/longitude.");
  return {
    name: name.trim().slice(0, 80),
    lat: Math.trunc(lat * 10000) / 10000,
    lon: Math.trunc(lon * 10000) / 10000,
    timezone: tzlookup(
      Math.trunc(lat * 10000) / 10000,
      Math.trunc(lon * 10000) / 10000,
    ),
  };
}
export function validLocation(v: unknown): v is ForecastLocation {
  if (!v || typeof v !== "object") return false;
  const p = v as ForecastLocation;
  try {
    return (
      typeof p.name === "string" &&
      p.name.length > 0 &&
      p.name.length <= 80 &&
      finite(p.lat, -90, 90) &&
      finite(p.lon, -180, 180) &&
      p.timezone === tzlookup(p.lat, p.lon)
    );
  } catch {
    return false;
  }
}
export function validWeatherSettings(v: unknown): v is WeatherSettings {
  if (!v || typeof v !== "object") return false;
  const s = v as WeatherSettings;
  if (
    !["auto", "manual"].includes(s.mode) ||
    (s.location !== undefined && !validLocation(s.location))
  )
    return false;
  if (s.cache === undefined) return true;
  const c = s.cache;
  return (
    validLocation(c.location) &&
    time(c.fetchedAt) &&
    time(c.modelUpdatedAt) &&
    time(c.expiresAt) &&
    (c.lastModified === undefined || typeof c.lastModified === "string") &&
    Array.isArray(c.days) &&
    c.days.length > 0 &&
    c.days.length <= 12 &&
    new Set(c.days.map((d) => d.date)).size === c.days.length &&
    c.days.every(
      (d) =>
        /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
        Number.isFinite(Date.parse(d.date)) &&
        finite(d.cloud, 0, 100) &&
        finite(d.minC, -100, 70) &&
        finite(d.maxC, -100, 70) &&
        finite(d.rainMm, 0, 2000) &&
        finite(d.factor, 0.15, 1) &&
        finite(d.hours, 1, 25) &&
        Object.hasOwn(weatherFactors, d.condition),
    )
  );
}
export function dateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function dayKey(offset: number, timezone: string, now = new Date()) {
  const today = dateKey(now, timezone);
  return new Date(Date.parse(today + "T12:00:00Z") + offset * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function sameLocation(a?: ForecastLocation, b?: ForecastLocation) {
  return !!a && !!b && a.lat === b.lat && a.lon === b.lon;
}
export function weatherForDay(
  settings: WeatherSettings | undefined,
  manual: Weather[],
  day: number,
  now = new Date(),
) {
  const fallback = manual[day % manual.length];
  const cache =
    settings?.mode === "auto" &&
    sameLocation(settings.location, settings.cache?.location)
      ? settings.cache
      : undefined;
  const record = cache?.days.find(
    (d) => d.date === dayKey(day, cache.location.timezone, now),
  );
  return record
    ? {
        factor: record.factor,
        condition: record.condition,
        record,
        manual: false,
      }
    : {
        factor: weatherFactors[fallback],
        condition: fallback,
        record: undefined,
        manual: true,
      };
}
type MetRow = {
  time: string;
  data: {
    instant: {
      details: { air_temperature: number; cloud_area_fraction: number };
    };
    next_1_hours?: { details: { precipitation_amount?: number } };
    next_6_hours?: { details: { precipitation_amount?: number } };
  };
};
export function parseMet(
  data: unknown,
  location: ForecastLocation,
  now = new Date(),
  headers: Record<string, string> = {},
): WeatherCache {
  const raw = data as {
    properties?: { meta?: { updated_at?: string }; timeseries?: MetRow[] };
  };
  const rows = raw?.properties?.timeseries;
  if (
    !Array.isArray(rows) ||
    !rows.length ||
    rows.length > 400 ||
    !time(raw.properties?.meta?.updated_at)
  )
    throw new Error("Weather provider returned an invalid forecast.");
  const buckets = new Map<
    string,
    {
      cloud: number;
      weight: number;
      cloudSum: number;
      min: number;
      max: number;
      rain: number;
      hours: number;
    }
  >();
  for (let i = 0; i < rows.length - 1; i++) {
    const r = rows[i],
      next = rows[i + 1];
    const details = r.data?.instant?.details;
    const start = Date.parse(r.time),
      end = Date.parse(next.time);
    if (
      !details ||
      !finite(details.cloud_area_fraction, 0, 100) ||
      !finite(details.air_temperature, -100, 70) ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start
    )
      throw new Error("Weather provider returned incomplete readings.");
    const hours = Math.min(6, (end - start) / 3600000);
    const precipitation =
      (hours <= 1 ? r.data.next_1_hours : r.data.next_6_hours)?.details
        ?.precipitation_amount || 0;
    for (let hour = 0; hour < hours; hour++) {
      const at = new Date(start + hour * 3600000),
        key = dateKey(at, location.timezone);
      const localHour = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: location.timezone,
          hour: "numeric",
          hourCycle: "h23",
        }).format(at),
      );
      const weight = Math.max(
        0,
        Math.sin((Math.PI * (localHour + 0.5 - 6)) / 12),
      );
      const b = buckets.get(key) || {
        cloud: 0,
        weight: 0,
        cloudSum: 0,
        min: 70,
        max: -100,
        rain: 0,
        hours: 0,
      };
      b.cloud += details.cloud_area_fraction * weight;
      b.weight += weight;
      b.cloudSum += details.cloud_area_fraction;
      b.min = Math.min(b.min, details.air_temperature);
      b.max = Math.max(b.max, details.air_temperature);
      b.rain += precipitation / hours;
      b.hours++;
      buckets.set(key, b);
    }
  }
  const today = dayKey(0, location.timezone, now);
  const days: WeatherDay[] = [...buckets]
    .filter(([key]) => key >= today)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 10)
    .map(([date, b]) => {
      const cloud = Math.min(
        100,
        Math.max(0, b.weight ? b.cloud / b.weight : b.cloudSum / b.hours),
      );
      return {
        date,
        cloud,
        minC: b.min,
        maxC: b.max,
        rainMm: b.rain,
        hours: b.hours,
        factor: Math.max(0.25, 1 - 0.75 * (cloud / 100) ** 3),
        condition:
          b.rain >= 2
            ? "rain"
            : cloud < 25
              ? "sunny"
              : cloud < 70
                ? "mixed"
                : "overcast",
      };
    });
  if (!days.length) throw new Error("Forecast has no upcoming dates.");
  const header = (key: string) =>
    Object.entries(headers).find(([k]) => k.toLowerCase() === key)?.[1];
  const expires = Date.parse(header("expires") || "");
  return {
    location,
    fetchedAt: now.toISOString(),
    modelUpdatedAt: raw.properties!.meta!.updated_at!,
    expiresAt: new Date(
      Math.max(
        now.getTime() + 15 * 60000,
        Number.isFinite(expires) ? expires : now.getTime() + 3600000,
      ),
    ).toISOString(),
    lastModified: header("last-modified"),
    days,
  };
}
export type HttpResult = {
  status: number;
  data: unknown;
  headers: Record<string, string>;
};
export async function getJson(
  url: string,
  headers: Record<string, string> = {},
): Promise<HttpResult> {
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.get({
      url,
      headers: { "User-Agent": APP_AGENT, ...headers },
      connectTimeout: 12000,
      readTimeout: 15000,
    });
    return r;
  }
  if (
    url.startsWith(MET_URL) &&
    typeof location !== "undefined" &&
    location.protocol === "file:"
  )
    throw new Error(
      "Auto weather needs the Android app or a served web preview. Manual mode works in this downloaded HTML file.",
    );
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  return {
    status: response.status,
    data: response.status === 304 ? null : await response.json(),
    headers: Object.fromEntries(response.headers.entries()),
  };
}
async function performWeather(
  location: ForecastLocation,
  cache?: WeatherCache,
  request = getJson,
  now = new Date(),
): Promise<WeatherCache> {
  if (
    sameLocation(location, cache?.location) &&
    cache &&
    Date.parse(cache.expiresAt) > now.getTime()
  )
    return cache;
  const headers: Record<string, string> = {};
  if (
    Capacitor.isNativePlatform() &&
    sameLocation(location, cache?.location) &&
    cache?.lastModified
  )
    headers["If-Modified-Since"] = cache.lastModified;
  const response = await request(
    `${MET_URL}?lat=${location.lat.toFixed(4)}&lon=${location.lon.toFixed(4)}`,
    headers,
  );
  if (
    response.status === 304 &&
    cache &&
    sameLocation(location, cache.location)
  )
    return {
      ...cache,
      fetchedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 3600000).toISOString(),
    };
  if (response.status === 429)
    throw new Error("Weather service is busy. Please wait before refreshing.");
  if (response.status < 200 || response.status >= 300)
    throw new Error(
      `Weather unavailable (${response.status}). Your cached and Manual settings are unchanged.`,
    );
  return parseMet(response.data, location, now, response.headers);
}
export async function deviceLocation(
  getPosition = () =>
    Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 300000,
    }),
): Promise<ForecastLocation> {
  try {
    const p = await getPosition();
    return locationFrom(
      "Device location",
      p.coords.latitude,
      p.coords.longitude,
    );
  } catch {
    throw new Error(
      "Location access was declined or is unavailable. Choose a place or enter coordinates below.",
    );
  }
}

const inFlight = new Map<string, Promise<WeatherCache>>();
const retryAfter = new Map<string, number>();
export function fetchWeather(
  location: ForecastLocation,
  cache?: WeatherCache,
  request = getJson,
  now = new Date(),
): Promise<WeatherCache> {
  const key = `${location.lat},${location.lon}`;
  if (
    cache &&
    sameLocation(location, cache.location) &&
    Date.parse(cache.expiresAt) > now.getTime()
  )
    return Promise.resolve(cache);
  if ((retryAfter.get(key) || 0) > now.getTime())
    return Promise.reject(
      new Error(
        "Please wait a minute before retrying weather. Cached/Manual settings remain available.",
      ),
    );
  const existing = inFlight.get(key);
  if (existing) return existing;
  const task = performWeather(location, cache, request, now)
    .catch((error) => {
      retryAfter.set(
        key,
        now.getTime() + (String(error).includes("busy") ? 15 : 1) * 60000,
      );
      throw error;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}

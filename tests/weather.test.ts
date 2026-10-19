import { describe, it, expect, vi } from "vitest";
import {
  locationFrom,
  parseMet,
  weatherForDay,
  fetchWeather,
  deviceLocation,
  validWeatherSettings,
  dayKey,
  type WeatherCache,
} from "../src/weather";
import { Geolocation } from "@capacitor/geolocation";
import { clone, defaultProfile, forecast } from "../src/engine";
const now = new Date("2026-10-19T00:00:00Z");
const location = locationFrom("Cairns", -16.9186, 145.7781);
function met(cloud = 100) {
  return {
    properties: {
      meta: { updated_at: now.toISOString() },
      timeseries: Array.from({ length: 241 }, (_, i) => ({
        time: new Date(now.getTime() + i * 3600000).toISOString(),
        data: {
          instant: {
            details: {
              air_temperature: 20 + (i % 10),
              cloud_area_fraction: cloud,
            },
          },
          next_1_hours: { details: { precipitation_amount: 0.1 } },
        },
      })),
    },
  };
}
const cache = () => parseMet(met(), location, now);
describe("weather service and date-safe fallback", () => {
  it("aggregates cloud, temperature and precipitation and uses cloud data rather than icons", () => {
    const c = cache();
    expect(c.days[0].factor).toBeCloseTo(0.25, 10);
    expect(c.days[0].minC).toBe(20);
    expect(c.days[0].maxC).toBe(29);
    expect(c.days[0].rainMm).toBeCloseTo(c.days[0].hours * 0.1);
    expect(validWeatherSettings({ mode: "auto", location, cache: c })).toBe(
      true,
    );
  });
  it("keeps zero-cloud yield at 100% regardless of rain symbol", () => {
    const c = parseMet(met(0), location, now);
    expect(c.days[0].factor).toBe(1);
  });
  it("aligns dates to forecast location and never recycles old days", () => {
    const c = cache();
    const selected = { mode: "auto" as const, location, cache: c };
    expect(dayKey(0, location.timezone, now)).toBe("2026-10-19");
    expect(weatherForDay(selected, defaultProfile.weather, 0, now).manual).toBe(
      false,
    );
    expect(
      weatherForDay(
        selected,
        defaultProfile.weather,
        0,
        new Date("2026-11-01"),
      ),
    ).toMatchObject({ manual: true, factor: 1 });
  });
  it("preserves manual choices and excludes a different location cache", () => {
    const c = cache();
    expect(
      weatherForDay({ mode: "manual", location, cache: c }, ["rain"], 0, now)
        .factor,
    ).toBe(0.1);
    expect(
      weatherForDay(
        {
          mode: "auto",
          location: locationFrom("Perth", -31.9523, 115.8613),
          cache: c,
        },
        ["mixed"],
        0,
        now,
      ).factor,
    ).toBe(0.65);
  });
  it("uses real cloud multiplier exactly once in solar calculations", () => {
    const p = clone(defaultProfile);
    p.weatherSettings = { mode: "auto", location, cache: cache() };
    p.solarEfficiency = 1;
    p.mpptA = 1000;
    p.shared = false;
    expect(forecast(p, 1, now).days[0].solarWh).toBeCloseTo(500 * 5 * 0.25);
  });
  it("respects unexpired cache and does not call the provider", async () => {
    const c = cache();
    const request = vi.fn();
    expect(await fetchWeather(location, c, request, now)).toEqual(c);
    expect(request).not.toHaveBeenCalled();
  });
  it("requests rounded coordinates and rejects failed HTTP responses", async () => {
    const other = locationFrom("Request test", -20.1234567, 140.654321);
    const request = vi
      .fn()
      .mockResolvedValue({ status: 503, data: {}, headers: {} });
    await expect(fetchWeather(other, undefined, request, now)).rejects.toThrow(
      "503",
    );
    expect(request.mock.calls[0][0]).toContain("lat=-20.1234&lon=140.6543");
  });
  it("keeps cache unchanged on a failed refresh and uses conditional cache safely", async () => {
    const other = locationFrom("304 test", -21, 141);
    const c = {
      ...cache(),
      location: other,
      expiresAt: "2026-10-18T00:00:00Z",
    };
    const request = vi
      .fn()
      .mockResolvedValue({ status: 304, data: null, headers: {} });
    const next = await fetchWeather(other, c, request, now);
    expect(next.days).toEqual(c.days);
    expect(next.modelUpdatedAt).toBe(c.modelUpdatedAt);
    expect(next.fetchedAt).toBe(now.toISOString());
  });
  it("rejects malformed provider data and imported location/cache data", () => {
    expect(() => parseMet({}, location, now)).toThrow();
    expect(
      validWeatherSettings({
        mode: "auto",
        location: { ...location, lat: 999 },
      }),
    ).toBe(false);
    expect(
      validWeatherSettings({
        mode: "auto",
        location,
        cache: { ...cache(), days: [{ date: "bad" }] },
      }),
    ).toBe(false);
  });
  it("handles granted, denied and unavailable device locations", async () => {
    const spy = vi.fn().mockResolvedValue({
      coords: {
        latitude: -16.9,
        longitude: 145.7,
        accuracy: 100,
        altitude: null,
        altitudeAccuracy: null,
        speed: null,
        heading: null,
      },
      timestamp: 0,
    });
    expect((await deviceLocation(spy)).name).toBe("Device location");
    spy.mockRejectedValue(new Error("denied"));
    await expect(deviceLocation(spy)).rejects.toThrow("Choose a place");
    spy.mockRejectedValue(new Error("unavailable"));
    await expect(deviceLocation(spy)).rejects.toThrow("unavailable");
  });
});

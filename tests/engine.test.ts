import { describe, it, expect } from "vitest";
import {
  clone,
  defaultProfile,
  forecast,
  dailyLoad,
  applianceWh,
  active,
  validProfile,
} from "../src/engine";
import type { Profile } from "../src/engine";
import { initialStore, parseBackup } from "../src/storage";
const blank = (): Profile => ({
  ...clone(defaultProfile),
  roofW: 0,
  blanketW: 0,
  driveHours: 0,
  acHours: 0,
  appliances: [],
});
describe("energy calculations", () => {
  it("Savannah-X has 7680 Wh nominal and 6144 Wh above 20% reserve", () => {
    const p = blank();
    expect(p.ah * p.voltage).toBe(7680);
    expect(p.ah * p.voltage * 0.8).toBe(6144);
  });
  it("calculates duty cycles and inverter conversion once", () => {
    const p = blank();
    const a = {
      ...defaultProfile.appliances[0],
      watts: 100,
      hours: 10,
      duty: 0.5,
      ac: true,
    };
    expect(applianceWh(a, p)).toBeCloseTo(555.5556, 3);
  });
  it("conserves energy with constant DC load", () => {
    const p = blank();
    p.appliances = [
      { ...defaultProfile.appliances[0], watts: 100, hours: 24, duty: 1 },
    ];
    expect(forecast(p, 1).days[0].soc).toBeCloseTo(
      ((7680 - 2400) / 7680) * 100,
      8,
    );
  });
  it("does not generate at night and integrates peak sun hours", () => {
    const p = blank();
    p.soc = 0;
    p.roofW = 200;
    p.psh = 5;
    p.solarEfficiency = 0.8;
    const f = forecast(p, 1);
    expect(f.days[0].solarWh).toBeCloseTo(800, 7);
    expect(f.points[24].soc).toBe(0);
    expect(f.days[0].soc).toBeCloseTo((760 / 7680) * 100, 7);
  });
  it("caps solar and shared solar/alternator output", () => {
    const p = blank();
    p.soc = 0;
    p.roofW = 5000;
    p.driveHours = 24;
    p.dcdcA = 30;
    p.sharedA = 30;
    const r = forecast(p, 1).days[0];
    expect(r.solarWh + r.driveWh).toBeLessThanOrEqual(30 * 14.4 * 24 + 0.001);
  });
  it("caps total net charging and accounts for spilled energy", () => {
    const p = blank();
    p.soc = 0;
    p.acHours = 24;
    p.acA = 50;
    p.maxChargeA = 1;
    const r = forecast(p, 1).days[0];
    expect(r.soc).toBeCloseTo(((14.4 * 24 * 0.95) / 7680) * 100);
    expect(r.spilledWh).toBeGreaterThan(0);
  });
  it("never exceeds 100% or drops below zero; tracks unmet energy", () => {
    const p = blank();
    p.appliances = [
      { ...defaultProfile.appliances[0], watts: 1000, hours: 24, duty: 1 },
    ];
    const r = forecast(p, 1).days[0];
    expect(r.soc).toBe(0);
    expect(r.unservedWh).toBeCloseTo(24000 - 7680);
    p.appliances = [];
    p.acHours = 24;
    expect(forecast(p, 1).days[0].soc).toBe(100);
  });
  it("supports midnight-wrapping schedules", () => {
    expect(active(1, 22, 4)).toBe(true);
    expect(active(2, 22, 4)).toBe(false);
  });
  it("scales 24 V and 48 V energy rather than adding parallel voltage", () => {
    const p = blank();
    p.soc = 50;
    p.voltage = 51.2;
    expect(p.ah * p.voltage).toBe(30720);
    expect(forecast(p, 1).days[0].soc).toBe(50);
  });
  it("accounts for inverter idle draw once for overlapping AC appliances", () => {
    const p = blank();
    p.appliances = [
      { ...defaultProfile.appliances[0], ac: true, hours: 24, watts: 0 },
      { ...defaultProfile.appliances[1], ac: true, hours: 24, watts: 0 },
    ];
    expect(dailyLoad(p)).toBe(8 * 24);
    expect(forecast(p, 1).days[0].loadWh).toBe(8 * 24);
  });
  it("rain produces 10% of clear-sky energy", () => {
    const p = blank();
    p.roofW = 200;
    p.soc = 0;
    p.weather.fill("rain");
    expect(forecast(p, 1).days[0].solarWh).toBeCloseTo(75);
  });
  it("records reserve crossing even if recovered later", () => {
    const p = blank();
    p.soc = 21;
    p.roofW = 1000;
    p.appliances = [
      { ...defaultProfile.appliances[0], watts: 100, hours: 24, duty: 1 },
    ];
    const f = forecast(p, 1);
    expect(f.firstReserveHour).toBeLessThan(6);
    expect(f.days[0].reserveCrossed).toBe(true);
    expect(f.days[0].soc).toBeGreaterThan(20);
  });
});
describe("backup validation", () => {
  it("roundtrips all settings", () => {
    const s = initialStore();
    expect(parseBackup(JSON.stringify(s))).toEqual(s);
  });
  it("rejects broken versions, nonfinite values, missing fields and duplicate ids", () => {
    const s = initialStore();
    expect(() => parseBackup('{"version":9}')).toThrow();
    const p = clone(defaultProfile);
    p.ah = NaN;
    expect(validProfile(p)).toBe(false);
    delete (p as Partial<typeof p>).ah;
    expect(validProfile(p)).toBe(false);
    s.profiles.push(clone(s.profiles[0]));
    expect(() => parseBackup(JSON.stringify(s))).toThrow();
  });
});

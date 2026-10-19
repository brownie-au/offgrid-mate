// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  clone,
  defaultProfile,
  dailyLoad,
  forecast,
  validProfile,
} from "../src/engine";
import {
  applySource,
  removeSource,
  patchProfile,
  parseCatalogue,
  toAppliance,
  type SourceEquipment,
  type CustomTemplate,
} from "../src/equipment";
import catalogue from "../public/equipment-catalogue.json";
import { parseBackup, initialStore } from "../src/storage";
import { refreshCatalogue, readCatalogue } from "../src/catalogue";
const source = (slot: SourceEquipment["slot"]): SourceEquipment => ({
  id: "source",
  name: "Test source",
  slot,
  watts: 200,
  amps: 40,
  voltage: 12,
  quantity: 1,
  hours: 2,
  start: 9,
  idleW: 7,
  efficiency: 0.86,
  shared: true,
  priority: "combined",
});
beforeEach(() => localStorage.clear());
describe("equipment model and migration", () => {
  it("validates broad manufacturer coverage and rejects fake specifications", () => {
    const p = parseCatalogue(catalogue);
    expect(p.length).toBeGreaterThanOrEqual(300);
    expect(new Set(p.map((x) => x.brand)).size).toBeGreaterThanOrEqual(20);
    expect(new Set(p.map((x) => x.id)).size).toBe(p.length);
    expect(new Set(p.map((x) => `${x.brand}:${x.model}`)).size).toBe(p.length);
    for (const item of p) {
      expect(item.notes.length).toBeGreaterThan(20);
      if (item.category === "solar") expect(item.watts).toBeGreaterThan(0);
      if (["dcdc", "mains"].includes(item.category)) {
        expect(item.amps).toBeGreaterThan(0);
        expect([12, 24, 48]).toContain(item.voltage);
        expect(item.watts).toBeUndefined();
      }
      if (item.category === "inverter") {
        expect(item.idleW).toBeGreaterThanOrEqual(0);
        expect(item.efficiency).toBeGreaterThan(0);
        expect(item.watts).toBeUndefined();
      }
    }
    expect(() =>
      parseCatalogue({ schema: 1, products: [{ ...p[0], amps: "40" }] }),
    ).toThrow();
  });
  it("keeps original product identifiers and distinguishes 12V and 24V Renogy output", () => {
    const p = parseCatalogue(catalogue);
    for (const id of [
      "renogy-rbc40d1s",
      "renogy-rsp200d-g3",
      "engel-mtv80",
      "redarc-bcdc1225d",
      "victron-orion-12-12-30",
      "victron-ip22-12-15",
      "victron-inverter-12-500-hw15",
      "ecoflow-110-lightweight",
      "bluetti-pv120",
      "starlink-mini",
      "goalzero-lighthouse600",
      "dometic-cfx3-45",
    ]) {
      expect(p.some((item) => item.id === id)).toBe(true);
    }
    const renogy = p.filter((item) => item.model.startsWith("RBC2125DS"));
    expect(renogy.map(({ amps, voltage }) => ({ amps, voltage }))).toEqual([
      { amps: 50, voltage: 12 },
      { amps: 25, voltage: 24 },
    ]);
  });
  it("replaces an old 12-item cache with the expanded offline bundle", () => {
    localStorage.setItem(
      "offgrid-mate:catalogue:v1",
      JSON.stringify({
        schema: 1,
        products: catalogue.products.slice(0, 12),
        checkedAt: new Date().toISOString(),
      }),
    );
    expect(readCatalogue().products).toEqual(parseCatalogue(catalogue));
    expect(readCatalogue().updatedAt).toBeUndefined();
  });
  it("keeps newer cached revisions offline and refuses catalogue downgrades", async () => {
    const next = {
      ...catalogue,
      revision: catalogue.revision + 1,
      products: [
        ...catalogue.products,
        { ...catalogue.products[0], id: "future-product" },
      ],
    };
    await refreshCatalogue(
      vi.fn().mockResolvedValue({ status: 200, data: next }),
    );
    expect(readCatalogue().products.at(-1)?.id).toBe("future-product");
    await expect(
      refreshCatalogue(
        vi.fn().mockResolvedValue({ status: 200, data: catalogue }),
      ),
    ).rejects.toThrow("older catalogue");
    expect(readCatalogue().products.at(-1)?.id).toBe("future-product");
  });
  it("keeps v1 backups and existing appliances unchanged", () => {
    const s = initialStore();
    expect(parseBackup(JSON.stringify(s))).toEqual(s);
    expect(validProfile(s.profiles[0])).toBe(true);
  });
  it("treats DC-DC rating as charging output, not an added load", () => {
    const p = applySource(clone(defaultProfile), source("dcdc"));
    expect(dailyLoad(p)).toBe(dailyLoad(defaultProfile));
    expect(p.dcdcA).toBe(40);
    expect(forecast(p, 1).days[0].driveWh).toBeGreaterThan(0);
    expect(validProfile(p)).toBe(true);
  });
  it("replaces solar slot instead of adding it twice and removes the source output", () => {
    const p = applySource(clone(defaultProfile), source("roof"));
    expect(p.roofW).toBe(200);
    expect(p.equipment).toHaveLength(1);
    expect(removeSource(p, p.equipment![0]).roofW).toBe(0);
  });
  it("removing a shared DC-DC/MPPT controller removes both charging paths", () => {
    const p = applySource(clone(defaultProfile), source("dcdc"));
    const cleared = removeSource(p, p.equipment![0]);
    expect(cleared.dcdcA).toBe(0);
    expect(cleared.mpptA).toBe(0);
    expect(forecast(cleared, 1).days[0].solarWh).toBe(0);
  });
  it("rejects wrong-voltage chargers without changing the profile", () => {
    const p = clone(defaultProfile);
    p.voltage = 25.6;
    expect(() => applySource(p, source("dcdc"))).toThrow("does not match");
    expect(p.dcdcA).toBe(30);
  });
  it("preserves charging overrides and source attribution through later edits", () => {
    let p = applySource(clone(defaultProfile), {
      ...source("dcdc"),
      productId: "verified",
      sourceUrl: "https://manufacturer.example/spec",
      sharedLimitA: 40,
      mpptLimitA: 40,
    });
    p = patchProfile(p, { dcdcA: 25, sharedA: 30, mpptA: 20 });
    expect(p.equipment![0]).toMatchObject({
      amps: 25,
      sharedLimitA: 30,
      mpptLimitA: 20,
      overridden: true,
      sourceUrl: "https://manufacturer.example/spec",
    });
    expect(applySource(p, p.equipment![0])).toMatchObject({
      dcdcA: 25,
      sharedA: 30,
      mpptA: 20,
    });
  });
  it("measured daily energy replaces watt/duty calculation, with inverter loss applied once", () => {
    const p = clone(defaultProfile);
    p.appliances = [
      {
        ...p.appliances[0],
        energyMethod: "daily",
        dailyWh: 240,
        watts: 999,
        duty: 0.01,
        hours: 24,
        ac: true,
      },
    ];
    p.inverterEfficiency = 0.8;
    p.inverterIdleW = 0;
    p.roofW = 0;
    p.blanketW = 0;
    expect(dailyLoad(p)).toBe(300);
    expect(forecast(p, 1).days[0].loadWh).toBeCloseTo(300);
  });
  it("inverter capacity is not a continuous load; only efficiency and idle are applied", () => {
    const p = applySource(clone(defaultProfile), {
      ...source("inverter"),
      watts: 450,
    });
    expect(p.inverterIdleW).toBe(7);
    expect(p.inverterEfficiency).toBe(0.86);
    expect(dailyLoad(p)).toBe(dailyLoad(defaultProfile));
  });
  it("saves new weather and custom fields through backup roundtrip", () => {
    const s = initialStore();
    s.profiles[0].weatherSettings = { mode: "manual" };
    s.profiles[0] = applySource(s.profiles[0], source("blanket"));
    expect(parseBackup(JSON.stringify(s))).toEqual(s);
  });
  it("refreshes a maintained JSON catalogue, caches it offline and rejects invalid updates", async () => {
    const products = parseCatalogue(catalogue);
    const result = await refreshCatalogue(
      vi.fn().mockResolvedValue({ status: 200, data: catalogue, headers: {} }),
    );
    expect(readCatalogue().products).toEqual(products);
    expect(result.updatedAt).toBeTruthy();
    await expect(
      refreshCatalogue(
        vi.fn().mockResolvedValue({
          status: 200,
          data: { schema: 1, products: [] },
          headers: {},
        }),
      ),
    ).rejects.toThrow("validation");
    expect(readCatalogue().products).toEqual(products);
  });
});

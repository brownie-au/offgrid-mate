// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { App } from "../src/main";
import { initialStore, STORAGE_KEY, parseBackup } from "../src/storage";
import { locationFrom, parseMet } from "../src/weather";
import catalogue from "../public/equipment-catalogue.json";
const nav = (name: string) =>
  fireEvent.click(screen.getAllByRole("button", { name })[0]);
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const saved = () => parseBackup(localStorage.getItem(STORAGE_KEY)!);
const add = () => {
  nav("Appliances");
  fireEvent.click(screen.getByRole("button", { name: "Add appliance" }));
};
describe("weather and equipment user flows", () => {
  it("browses the expanded catalogue offline by category and clears old searches on brand change", () => {
    render(<App />);
    add();
    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "Renogy" },
    });
    fireEvent.change(screen.getByLabelText("Filter product category"), {
      target: { value: "solar" },
    });
    const models = screen.getByLabelText(
      "Product / Model",
    ) as HTMLSelectElement;
    expect([...models.options].slice(1).length).toBeGreaterThan(10);
    expect(
      [...models.options]
        .slice(1)
        .every(
          (o) =>
            catalogue.products.find((p) => p.id === o.value)?.category ===
            "solar",
        ),
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("Search products"), {
      target: { value: "ShadowFlux" },
    });
    expect(
      [...models.options].slice(1).every((o) => o.text.includes("ShadowFlux")),
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "Brass Monkey" },
    });
    expect(
      (screen.getByLabelText("Search products") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("Filter product category") as HTMLSelectElement)
        .value,
    ).toBe("all");
    const model = catalogue.products.find(
      (p) => p.brand === "Brass Monkey" && p.model.startsWith("GH1640"),
    )!;
    fireEvent.change(models, { target: { value: model.id } });
    expect(
      (screen.getByLabelText("Running power") as HTMLInputElement).value,
    ).toBe("60");
    fireEvent.click(screen.getByRole("button", { name: "Save appliance" }));
    expect(saved().profiles[0].appliances.at(-1)).toMatchObject({
      watts: 60,
      duty: 0.45,
      hours: 24,
      productId: model.id,
    });
  });
  it("uses AC inverter accounting for a stock Starlink kit and keeps it after reopening", () => {
    render(<App />);
    add();
    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "Starlink" },
    });
    const product = catalogue.products.find((p) =>
      p.model.startsWith("Standard (Gen 3"),
    )!;
    fireEvent.change(screen.getByLabelText("Product / Model"), {
      target: { value: product.id },
    });
    expect(
      (screen.getByLabelText("Runs through an AC inverter") as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Running power") as HTMLInputElement).value,
    ).toBe("100");
    fireEvent.click(screen.getByRole("button", { name: "Save appliance" }));
    expect(saved().profiles[0].appliances.at(-1)).toMatchObject({
      ac: true,
      watts: 100,
      duty: 1,
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Starlink Standard \(Gen 3/ }),
    );
    expect(
      (screen.getByLabelText("Runs through an AC inverter") as HTMLInputElement)
        .checked,
    ).toBe(true);
  });
  it("lists GME radio models without confusing RF watts or fuse current with demand", () => {
    render(<App />);
    add();
    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "GME" },
    });
    const product = catalogue.products.find((p) =>
      p.model.startsWith("XRS-335C"),
    )!;
    expect(
      screen.getByRole("option", { name: /XRS-335C.*Enter power/ }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Product / Model"), {
      target: { value: product.id },
    });
    expect(
      (screen.getByLabelText("Running power") as HTMLInputElement).value,
    ).toBe("0");
    fireEvent.click(screen.getByRole("button", { name: "Save appliance" }));
    expect(
      screen.getByText(/Enter measured power or daily energy/),
    ).toBeTruthy();
  });
  it("saves manual weather immediately, recalculates offline and survives reopening", () => {
    const v = render(<App />);
    nav("Forecast");
    fireEvent.change(screen.getByLabelText("Day 1 weather"), {
      target: { value: "rain" },
    });
    expect(saved().profiles[0].weather[0]).toBe("rain");
    expect(screen.getByText("Solar × 0.10")).toBeTruthy();
    v.unmount();
    render(<App />);
    nav("Forecast");
    expect(
      (screen.getByLabelText("Day 1 weather") as HTMLSelectElement).value,
    ).toBe("rain");
  });
  it("persists Auto mode with no cache and offers Manual fallback offline", () => {
    const v = render(<App />);
    nav("Forecast");
    fireEvent.click(screen.getByRole("button", { name: "Auto" }));
    expect(screen.getByText(/No cached forecast/)).toBeTruthy();
    expect(saved().profiles[0].weatherSettings?.mode).toBe("auto");
    v.unmount();
    render(<App />);
    nav("Forecast");
    expect(
      screen.getByRole("button", { name: "Auto" }).getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Use Manual" }));
    expect(saved().profiles[0].weatherSettings?.mode).toBe("manual");
  });
  it("shows stale cache age and preserves original manual selections", () => {
    const s = initialStore(),
      location = locationFrom("Cairns", -16.9186, 145.7781);
    const start = Date.now() - 2 * 3600000;
    const raw = {
      properties: {
        meta: { updated_at: new Date(start).toISOString() },
        timeseries: Array.from({ length: 72 }, (_, i) => ({
          time: new Date(start + i * 3600000).toISOString(),
          data: {
            instant: {
              details: { air_temperature: 25, cloud_area_fraction: 80 },
            },
          },
        })),
      },
    };
    const cache = parseMet(raw, location, new Date(start));
    cache.expiresAt = new Date(start + 60000).toISOString();
    s.profiles[0].weatherSettings = { mode: "auto", location, cache };
    s.profiles[0].weather[0] = "rain";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    render(<App />);
    nav("Forecast");
    expect(screen.getByText(/Offline · Stale cached forecast/)).toBeTruthy();
    expect(screen.getAllByText(/Manual fallback/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Manual" }));
    expect(
      (screen.getByLabelText("Day 1 weather") as HTMLSelectElement).value,
    ).toBe("rain");
  });
  it("filters brands and products, prefills Engel assumptions and preserves overrides", () => {
    render(<App />);
    add();
    fireEvent.change(screen.getByLabelText("Search brands"), {
      target: { value: "Engel" },
    });
    expect(screen.queryByRole("option", { name: "Renogy" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "Engel" },
    });
    fireEvent.change(screen.getByLabelText("Product / Model"), {
      target: { value: "engel-mtv80" },
    });
    expect(
      (screen.getByLabelText("Running power") as HTMLInputElement).value,
    ).toBe("43.2");
    expect(screen.getByText(/Variable current/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Running power"), {
      target: { value: "38" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save appliance" }));
    const a = saved().profiles[0].appliances.at(-1)!;
    expect(a.watts).toBe(38);
    expect(a.sourceUrl).toContain("engelaustralia");
    expect(a.overridden).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Engel MT-V80F/ }));
    expect(
      (screen.getByLabelText("Running power") as HTMLInputElement).value,
    ).toBe("38");
  });
  it("adds the Renogy charger to charging settings and not daily appliance loads", () => {
    render(<App />);
    add();
    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "Renogy" },
    });
    fireEvent.change(screen.getByLabelText("Product / Model"), {
      target: { value: "renogy-rbc40d1s" },
    });
    expect(
      (
        screen.getByLabelText(
          "Battery charger output current",
        ) as HTMLInputElement
      ).value,
    ).toBe("40");
    fireEvent.click(
      screen.getByRole("button", { name: "Save charging equipment" }),
    );
    const p = saved().profiles[0];
    expect(p.dcdcA).toBe(40);
    expect(p.appliances).toHaveLength(4);
    expect(p.equipment?.[0].productId).toBe("renogy-rbc40d1s");
  });
  it("requires manual values for missing specifications and saves reusable custom equipment", () => {
    render(<App />);
    add();
    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "Goal Zero" },
    });
    fireEvent.change(screen.getByLabelText("Product / Model"), {
      target: { value: "goalzero-lighthouse600" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save appliance" }));
    expect(
      screen.getByText(/Enter measured power or daily energy/),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "custom" },
    });
    fireEvent.change(screen.getByLabelText("Appliance name"), {
      target: { value: "Custom camp light" },
    });
    fireEvent.change(screen.getByLabelText("Running power"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save appliance" }));
    expect(saved().customEquipment?.[0].watts).toBe(8);
    fireEvent.click(screen.getByRole("button", { name: "Add appliance" }));
    fireEvent.change(screen.getByLabelText("Reuse saved custom equipment"), {
      target: { value: saved().customEquipment![0].id },
    });
    expect(
      (screen.getByLabelText("Running power") as HTMLInputElement).value,
    ).toBe("8");
    fireEvent.click(
      screen.getByRole("button", { name: "Delete saved Custom camp light" }),
    );
    expect(saved().customEquipment).toHaveLength(0);
  });
  it("loads a real-shaped forecast online with manually selected location and caches it", async () => {
    vi.restoreAllMocks();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const start = Date.now();
    const raw = {
      properties: {
        meta: { updated_at: new Date(start).toISOString() },
        timeseries: Array.from({ length: 241 }, (_, i) => ({
          time: new Date(start + i * 3600000).toISOString(),
          data: {
            instant: {
              details: { air_temperature: 24, cloud_area_fraction: 50 },
            },
            next_1_hours: { details: { precipitation_amount: 0 } },
          },
        })),
      },
    };
    const fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => raw,
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", fetch);
    render(<App />);
    nav("Forecast");
    fireEvent.click(screen.getByRole("button", { name: "Auto" }));
    fireEvent.change(screen.getByLabelText("Forecast location"), {
      target: { value: "Cairns" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Set location" }));
    await waitFor(
      () =>
        expect(
          screen
            .getAllByRole("status")
            .map((s) => s.textContent)
            .join("|"),
        ).toContain("Forecast checked"),
      { timeout: 3000 },
    );
    expect(saved().profiles[0].weatherSettings?.cache?.location.name).toBe(
      "Cairns",
    );
    expect(fetch.mock.calls[0][0]).toContain("api.met.no");
    expect(screen.getByText(/Cached forecast · Cairns/)).toBeTruthy();
    expect(saved().profiles[0].weather).toEqual(
      initialStore().profiles[0].weather,
    );
  });
});

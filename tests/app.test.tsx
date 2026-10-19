// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { App } from "../src/main";
import { STORAGE_KEY, initialStore } from "../src/storage";

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
});
const nav = (name: string) =>
  fireEvent.click(screen.getAllByRole("button", { name })[0]);
describe("working app flows", () => {
  it("restores a backup only after confirmation", async () => {
    const view = render(<App />);
    nav("My setups");
    const backup = initialStore();
    backup.profiles[0].name = "Restored camp";
    const file = new File([JSON.stringify(backup)], "backup.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: async () => JSON.stringify(backup),
    });
    fireEvent.change(view.container.querySelector("input[type=file]")!, {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Replace & restore" }),
      ).toBeTruthy(),
    );
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].name,
    ).toBe("Savannah-X");
    fireEvent.click(screen.getByRole("button", { name: "Replace & restore" }));
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].name,
    ).toBe("Restored camp");
  });
  it("rejects an invalid backup without changing saved data", async () => {
    const view = render(<App />);
    nav("My setups");
    const before = localStorage.getItem(STORAGE_KEY);
    const file = new File(["broken"], "bad.json", { type: "application/json" });
    Object.defineProperty(file, "text", {
      value: async () => '{"version":1,"profiles":[]}',
    });
    fireEvent.change(view.container.querySelector("input[type=file]")!, {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "not a valid OffGrid Mate",
      ),
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("shows the Savannah-X profile and persists an appliance change after remount", () => {
    const view = render(<App />);
    expect(screen.getByText("Hello, happy camper.")).toBeTruthy();
    nav("Appliances");
    fireEvent.click(
      screen.getByRole("switch", { name: "Enable Starlink Mini" }),
    );
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].appliances[1]
        .enabled,
    ).toBe(false);
    view.unmount();
    render(<App />);
    nav("Appliances");
    expect(
      screen
        .getByRole("switch", { name: "Enable Starlink Mini" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });
  it("adds, edits and removes a scheduled appliance", () => {
    render(<App />);
    nav("Appliances");
    fireEvent.click(screen.getByRole("button", { name: "Add appliance" }));
    fireEvent.change(screen.getByLabelText("Appliance name"), {
      target: { value: "Coffee machine" },
    });
    fireEvent.change(screen.getByLabelText("Running power"), {
      target: { value: "900" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save appliance" }));
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].appliances.at(
        -1,
      ).watts,
    ).toBe(900);
    fireEvent.click(screen.getByRole("button", { name: /Coffee machine/ }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].appliances
        .length,
    ).toBe(4);
  });
  it("keeps what-if changes separate until explicitly applied", () => {
    render(<App />);
    nav("Forecast");
    fireEvent.change(screen.getByRole("slider", { name: /Portable solar/ }), {
      target: { value: "800" },
    });
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].blanketW,
    ).toBe(300);
    fireEvent.click(screen.getByRole("button", { name: "Apply to setup" }));
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].blanketW,
    ).toBe(800);
  });
  it("saves charger settings, alternate voltages, theme and duplicated setups", () => {
    render(<App />);
    nav("Charging");
    fireEvent.change(screen.getByLabelText("Charger output current"), {
      target: { value: "25" },
    });
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].dcdcA,
    ).toBe(25);
    nav("My setups");
    fireEvent.change(screen.getByLabelText("System voltage"), {
      target: { value: "25.6" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.profiles).toHaveLength(2);
    expect(saved.profiles[1].voltage).toBe(25.6);
    expect(saved.activeId).toBe(saved.profiles[1].id);
    fireEvent.click(
      screen.getByRole("button", { name: "Toggle colour theme" }),
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("does not overwrite an unreadable stored backup on startup", () => {
    localStorage.setItem(STORAGE_KEY, "corrupt-original");
    render(<App />);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("corrupt-original");
    expect(screen.getByRole("alert").textContent).toContain(
      "Automatic saving is paused",
    );
  });
  it("does not overwrite saved configuration when a stale simulation is discarded", () => {
    render(<App />);
    nav("Forecast");
    fireEvent.change(screen.getByRole("slider", { name: /Portable solar/ }), {
      target: { value: "800" },
    });
    nav("Charging");
    fireEvent.change(screen.getByLabelText("Rooftop panels"), {
      target: { value: "400" },
    });
    nav("Forecast");
    expect(
      screen
        .getByRole("button", { name: "Apply to setup" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).profiles[0].roofW,
    ).toBe(400);
  });
});

import { NumberField, Slider } from "./Controls";
import { WeatherPanel } from "./WeatherPanel";
import { EquipmentEditor } from "./EquipmentEditor";
import {
  applySource,
  patchProfile,
  removeSource,
  type SourceEquipment,
  type CustomTemplate,
} from "./equipment";
import {
  weatherForDay,
  fetchWeather,
  sameLocation,
  type WeatherSettings,
} from "./weather";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BatteryCharging,
  Sun,
  PlugZap,
  LayoutDashboard,
  SlidersHorizontal,
  Settings,
  Plus,
  Trash2,
  Download,
  Upload,
  Moon,
  ArrowUpRight,
  Car,
  CloudSun,
  CloudRain,
  Cloud,
  Wifi,
  Refrigerator,
  Lightbulb,
  Smartphone,
  Check,
  ChevronRight,
  TentTree,
  Info,
  Copy,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  clone,
  forecast,
  validProfile,
  dailyLoad,
  applianceWh,
  type Profile,
  type Appliance,
  type Weather,
} from "./engine";
import { readStore, writeStore, parseBackup, type Store } from "./storage";
import "./style.css";
const wh = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(2)} kWh` : `${Math.round(n)} Wh`;
const weatherIcons = {
  sunny: Sun,
  mixed: CloudSun,
  overcast: Cloud,
  rain: CloudRain,
};
const weatherNames = {
  sunny: "Clear skies",
  mixed: "Mixed cloud",
  overcast: "Overcast",
  rain: "Rainy",
};
const tabs = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "appliances", label: "Appliances", icon: PlugZap },
  { id: "charging", label: "Charging", icon: Sun },
  { id: "simulate", label: "Forecast", icon: SlidersHorizontal },
  { id: "settings", label: "My setups", icon: Settings },
] as const;
type Tab = (typeof tabs)[number]["id"];
function CampArt() {
  return (
    <svg
      className="camp-art"
      viewBox="0 0 600 310"
      role="img"
      aria-label="Colourful campsite with a four-wheel drive, solar panel and mountain scenery"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#c4eee9" />
          <stop offset="1" stopColor="#edf7d1" />
        </linearGradient>
      </defs>
      <rect width="600" height="310" rx="28" fill="url(#sky)" />
      <circle cx="477" cy="65" r="36" fill="#ffd467" />
      <path d="M0 220 145 60 300 236 398 125 600 249V310H0Z" fill="#a6cec2" />
      <path d="m93 117 52-57 58 66-40-12-20 12-18-20Z" fill="#f5f9e8" />
      <path d="M0 245Q150 191 303 256T600 225V310H0Z" fill="#70af8c" />
      <path d="M0 282Q260 237 600 282V310H0Z" fill="#45856b" />
      <g fill="#286b57">
        <path d="m49 137-31 76h19l-28 51h77l-28-51h19Z" />
        <path d="m550 117-31 76h19l-28 51h77l-28-51h19Z" />
      </g>
      <path d="m330 259 64-93 65 93Z" fill="#ffc75d" />
      <path d="m394 166-14 93h79Z" fill="#eaa345" />
      <path d="m394 202-25 57h44Z" fill="#335e56" />
      <g transform="translate(111 166)">
        <path
          d="M0 40 20 0h112l33 40v51H0Z"
          fill="#f7f6df"
          stroke="#285e51"
          strokeWidth="5"
        />
        <path d="m28 9-13 31h131L121 9Z" fill="#78c4c3" />
        <path d="M76 9v76M7 49h146" stroke="#285e51" strokeWidth="4" />
        <rect x="26" y="-12" width="91" height="12" rx="4" fill="#335e56" />
        <rect x="6" y="56" width="16" height="12" rx="3" fill="#ffc85e" />
        <circle cx="34" cy="85" r="21" fill="#264b44" />
        <circle cx="132" cy="85" r="21" fill="#264b44" />
        <circle cx="34" cy="85" r="10" fill="#a3b9ac" />
        <circle cx="132" cy="85" r="10" fill="#a3b9ac" />
      </g>
      <g transform="translate(279 243) rotate(-12)">
        <path
          d="M0 0h50v34H0Z"
          fill="#3a6b8e"
          stroke="#e8f4e4"
          strokeWidth="3"
        />
        <path d="M17 0v34M34 0v34M0 17h50" stroke="#9bc6ca" strokeWidth="2" />
      </g>
      <g fill="#f9faf0">
        <rect x="299" y="54" width="70" height="14" rx="7" />
        <circle cx="326" cy="51" r="15" />
        <circle cx="345" cy="54" r="12" />
      </g>
    </svg>
  );
}
function Chart({ p }: { p: Profile }) {
  const f = forecast(p);
  const path = f.points
    .filter((_, i) => i % 4 === 0)
    .map(
      (x, i) => `${i ? "L" : "M"}${(x.hour / 168) * 700},${180 - x.soc * 1.6}`,
    )
    .join(" ");
  return (
    <div className="chart">
      <svg
        viewBox="-34 0 750 218"
        role="img"
        aria-label="Seven-day predicted battery state of charge"
      >
        <defs>
          <linearGradient id="area" x2="0" y2="1">
            <stop stopColor="#69b799" stopOpacity=".35" />
            <stop offset="1" stopColor="#69b799" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map((n) => (
          <g key={n}>
            <line
              x1="0"
              x2="700"
              y1={180 - n * 1.6}
              y2={180 - n * 1.6}
              className="gridline"
            />
            <text x="-8" y={184 - n * 1.6} textAnchor="end">
              {n}%
            </text>
          </g>
        ))}
        <path d={`${path}L700,180L0,180Z`} fill="url(#area)" />
        <line
          x1="0"
          x2="700"
          y1={180 - p.reserve * 1.6}
          y2={180 - p.reserve * 1.6}
          stroke="#dc9364"
          strokeDasharray="6 5"
        />
        <path
          d={path}
          fill="none"
          stroke="#269472"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {Array.from({ length: 7 }, (_, i) => (
          <text key={i} x={(i + 0.5) * 100} y="209" textAnchor="middle">
            Day {i + 1}
          </text>
        ))}
      </svg>
      <small>
        Dashed line: {p.reserve}% reserve · Starts at midnight · Planning
        estimate
      </small>
    </div>
  );
}
export function App() {
  const [loaded] = useState(readStore);
  const [store, setStore] = useState<Store>(loaded.store);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [notice, setNotice] = useState(loaded.error || "");
  const [forecastClock, setForecastClock] = useState(Date.now);
  useEffect(() => {
    const tick = () => setForecastClock(Date.now());
    const t = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  const [storageError, setStorageError] = useState("");
  const persistenceBlocked = useRef(Boolean(loaded.error));
  const [modal, setModal] = useState<Appliance | SourceEquipment | null>(null);
  const [sim, setSim] = useState<Profile | null>(null);
  const [imported, setImported] = useState<Store | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const restoreDialog = useRef<HTMLDialogElement>(null);
  const p = store.profiles.find((x) => x.id === store.activeId)!;
  const currentProfile = useRef(p);
  currentProfile.current = p;
  useEffect(() => {
    document.documentElement.dataset.theme = store.theme;
    if (persistenceBlocked.current) {
      setStorageError(
        "Saved data is unreadable. Automatic saving is paused to protect the original. Export your temporary setup or restore a valid backup.",
      );
      return;
    }
    try {
      writeStore(store);
      setStorageError("");
    } catch {
      setStorageError(
        "Changes are in memory only. Storage is unavailable or full. Export a backup now.",
      );
    }
  }, [store]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (imported) restoreDialog.current?.showModal();
    else restoreDialog.current?.close();
  }, [imported]);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      const settings = currentProfile.current.weatherSettings;
      if (
        settings?.mode !== "auto" ||
        !settings.location ||
        !navigator.onLine ||
        document.visibilityState === "hidden"
      )
        return;
      fetchWeather(settings.location, settings.cache)
        .then((cache) => {
          if (!alive || cache === settings.cache) return;
          setStore((s) => ({
            ...s,
            profiles: s.profiles.map((x) =>
              x.id === p.id &&
              sameLocation(x.weatherSettings?.location, cache.location)
                ? {
                    ...x,
                    weatherSettings: {
                      mode: "auto",
                      ...x.weatherSettings,
                      cache,
                    },
                  }
                : x,
            ),
          }));
          setSim((s) =>
            s && s.id === p.id
              ? {
                  ...s,
                  weatherSettings: {
                    mode: "auto",
                    ...s.weatherSettings,
                    cache,
                  },
                }
              : s,
          );
        })
        .catch(() => {
          /* cache/manual state remains unchanged; weather panel shows age and retry */
        });
    };
    refresh();
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [
    p.id,
    p.weatherSettings?.mode,
    p.weatherSettings?.location?.lat,
    p.weatherSettings?.location?.lon,
  ]);
  const update = (patch: Partial<Profile>) => {
    setSim(null);
    setStore((s) => ({
      ...s,
      profiles: s.profiles.map((x) =>
        x.id === s.activeId ? patchProfile(x, patch) : x,
      ),
    }));
  };
  const f = useMemo(
    () => forecast(p, 7, new Date(forecastClock)),
    [p, forecastClock],
  );
  const daily = dailyLoad(p);
  const usable = Math.max(0, (p.voltage * p.ah * (p.soc - p.reserve)) / 100);
  const runtime = daily ? usable / daily : null;
  const exportBackup = async () => {
    const text = JSON.stringify(store, null, 2);
    try {
      if (Capacitor.isNativePlatform()) {
        const saved = await Filesystem.writeFile({
          path: "offgrid-mate-backup.json",
          data: text,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({ title: "OffGrid Mate backup", url: saved.uri });
      } else {
        const url = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "offgrid-mate-backup.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setNotice("Backup ready. Keep it somewhere safe.");
    } catch {
      setNotice("Export failed. Please try again.");
    }
  };
  const addAppliance = () => {
    if (p.appliances.length >= 100) {
      setNotice("Maximum 100 appliances per setup.");
      return;
    }
    setModal({
      id: crypto.randomUUID(),
      name: "New appliance",
      watts: 20,
      hours: 2,
      start: 18,
      duty: 1,
      quantity: 1,
      ac: false,
      enabled: true,
    });
  };
  const editNum = (
    key: keyof Profile,
    label: string,
    suffix: string,
    max: number,
    step = 1,
    hint?: string,
  ) => (
    <NumberField
      label={label}
      value={p[key] as number}
      onChange={(n) => update({ [key]: n })}
      suffix={suffix}
      min={key === "chargeVoltage" ? 1 : 0}
      max={max}
      step={step}
      hint={hint}
    />
  );
  const currentSim = sim || p;
  const simulated = useMemo(
    () => forecast(currentSim, 7, new Date(forecastClock)),
    [currentSim, forecastClock],
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("dashboard");
          }}
        >
          <span className="brand-icon">
            <TentTree size={27} />
          </span>
          <span>
            OffGrid <strong>Mate</strong>
            <small>KNOW YOUR POWER.</small>
          </span>
        </a>
        <div className="edition">
          PROTOTYPE 2 <span>FIELD PREVIEW</span>
        </div>
        <nav>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "nav-active" : ""}
              onClick={() => {
                setTab(t.id);
                window.scrollTo(0, 0);
              }}
            >
              <t.icon size={21} />
              {t.label}
              {tab === t.id && <ChevronRight size={16} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-dot" /> Built for beyond reception.
          <small>Local calculations. No account needed.</small>
          <button
            className="text-button"
            onClick={() =>
              setStore((s) => ({
                ...s,
                theme: s.theme === "light" ? "dark" : "light",
              }))
            }
          >
            <Moon size={17} />{" "}
            {store.theme === "light" ? "Switch to dark" : "Switch to light"}
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="mobile-brand">
            <TentTree size={24} /> OffGrid Mate
          </div>
          <div className="breadcrumb">Your next adventure, powered.</div>
          <div className="top-actions">
            <span className="offline-pill">
              <span /> Offline ready
            </span>
            <button
              className="icon-button"
              aria-label="Toggle colour theme"
              onClick={() =>
                setStore((s) => ({
                  ...s,
                  theme: s.theme === "light" ? "dark" : "light",
                }))
              }
            >
              <Moon size={19} />
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {tab === "dashboard"
                  ? "A LITTLE PLANNING. A LOT MORE FREEDOM."
                  : "YOUR CAMP. YOUR POWER. YOUR WAY."}
              </p>
              <h1>
                {tabs.find((t) => t.id === tab)?.label === "Overview"
                  ? "Hello, happy camper."
                  : tabs.find((t) => t.id === tab)?.label}
              </h1>
              <p>
                {tab === "dashboard"
                  ? "Let’s keep the good times powered."
                  : "Fine-tune your setup and see what changes."}
              </p>
            </div>
            <label className="setup-select">
              <Car size={19} />
              <select
                aria-label="Active system configuration"
                value={p.id}
                onChange={(e) => {
                  setStore((s) => ({ ...s, activeId: e.target.value }));
                  setSim(null);
                }}
              >
                {store.profiles.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {storageError && (
            <div role="alert" className="warning">
              {storageError}
            </div>
          )}
          {tab === "dashboard" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="tag">
                    <TentTree size={15} /> THE OUTSIDE IS CALLING
                  </span>
                  <h2>
                    Know your power.
                    <br />
                    <em>Enjoy your freedom.</em>
                  </h2>
                  <p>
                    Cold drinks. Connected camps. Unforgettable detours.
                    <br />
                    See how far your power can take you.
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setSim(clone(p));
                      setTab("simulate");
                    }}
                  >
                    Plan my next escape <ArrowUpRight size={18} />
                  </button>
                </div>
                <CampArt />
              </section>
              <div className="stats">
                <section className="stat mint">
                  <div>
                    <BatteryCharging />
                    <span>Battery bank</span>
                  </div>
                  <h2>
                    {p.soc}
                    <small>%</small>
                  </h2>
                  <p>
                    {wh((p.voltage * p.ah * p.soc) / 100)} stored · {p.ah} Ah at{" "}
                    {p.voltage} V
                  </p>
                  <div className="progress">
                    <i style={{ width: `${p.soc}%` }} />
                  </div>
                  <span className="micro">
                    Manually entered state of charge
                  </span>
                </section>
                <section className="stat yellow">
                  <div>
                    <Sun />
                    <span>Day 1 solar harvest</span>
                  </div>
                  <h2>
                    {(f.days[0].solarWh / 1000).toFixed(2)}
                    <small>kWh</small>
                  </h2>
                  <p>
                    {p.roofW + p.blanketW} W panels ·{" "}
                    {
                      weatherNames[
                        weatherForDay(p.weatherSettings, p.weather, 0).condition
                      ]
                    }
                  </p>
                  <span className="chip">
                    {p.psh} peak sun hours ·{" "}
                    {Math.round(p.solarEfficiency * 100)}% yield
                  </span>
                </section>
                <section className="stat peach">
                  <div>
                    <PlugZap />
                    <span>Daily energy use</span>
                  </div>
                  <h2>
                    {Math.round(daily)}
                    <small>Wh</small>
                  </h2>
                  <p>
                    {p.appliances.filter((a) => a.enabled).length} active
                    appliances · including losses
                  </p>
                  <span className="chip">
                    {runtime === null
                      ? "No active load"
                      : `${runtime.toFixed(1)} days to reserve, without charging`}
                  </span>
                </section>
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="section-title">
                    <div>
                      <h3>Your week, unplugged.</h3>
                      <p>Battery forecast for your current plan</p>
                      {p.weatherSettings?.mode === "auto" && (
                        <small>
                          Auto weather ·{" "}
                          {p.weatherSettings.cache
                            ? `cached ${new Date(p.weatherSettings.cache.fetchedAt).toLocaleString()}`
                            : "no cache; Manual assumptions"}{" "}
                          · see Forecast for dates, age and fallback details.
                        </small>
                      )}
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setTab("simulate")}
                    >
                      Explore <ArrowUpRight size={17} />
                    </button>
                  </div>
                  <Chart p={p} />
                  <div
                    className={`insight ${f.firstReserveHour !== null ? "caution" : ""}`}
                  >
                    <Info size={19} />
                    <span>
                      {f.firstReserveHour !== null
                        ? `Your plan reaches the ${p.reserve}% reserve after ${f.firstReserveHour.toFixed(1)} hours. Try less load or more charging.`
                        : `Your plan stays above ${p.reserve}% reserve for all seven days.`}
                    </span>
                  </div>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <div>
                      <h3>What’s drawing power?</h3>
                      <p>Your daily energy breakdown</p>
                    </div>
                  </div>
                  <div className="appliance-summary">
                    {p.appliances
                      .filter((a) => a.enabled)
                      .slice(0, 5)
                      .map((a, i) => {
                        const Icon = [
                          Refrigerator,
                          Wifi,
                          Lightbulb,
                          Smartphone,
                        ][i % 4];
                        return (
                          <div key={a.id}>
                            <span className={`appliance-icon color-${i % 4}`}>
                              <Icon size={20} />
                            </span>
                            <span>
                              <b>{a.name}</b>
                              <small>
                                {a.watts} W · {a.hours} h/day ·{" "}
                                {Math.round(a.duty * 100)}% duty
                              </small>
                            </span>
                            <strong>
                              {Math.round(applianceWh(a, p))}
                              <small> Wh</small>
                            </strong>
                          </div>
                        );
                      })}
                  </div>
                  <button
                    className="wide-button"
                    onClick={() => setTab("appliances")}
                  >
                    Manage appliances <ChevronRight size={17} />
                  </button>
                </section>
              </div>
              <section className="trail-note">
                <Sun size={27} />
                <div>
                  <b>Chase sunsets, not battery anxiety.</b>
                  <p>
                    Forecasts are estimates. Start with measured appliance draw
                    and adjust for your conditions.
                  </p>
                </div>
                <span>LESS GUESSWORK. MORE ADVENTURE.</span>
              </section>
            </>
          )}
          {tab === "appliances" && (
            <>
              <div className="two-cards">
                <section className="panel">
                  <p className="eyebrow">DAILY DRAW</p>
                  <h2>{wh(daily)}</h2>
                  <p>Includes AC conversion and inverter idle draw.</p>
                </section>
                <section className="panel">
                  <p className="eyebrow">BATTERY-ONLY RUNTIME</p>
                  <h2>
                    {runtime === null
                      ? "No load"
                      : `${runtime.toFixed(1)} days`}
                  </h2>
                  <p>
                    Average load estimate to {p.reserve}% reserve; excludes
                    charging.
                  </p>
                </section>
              </div>
              <section className="panel">
                <div className="section-title">
                  <div>
                    <h3>Your camp essentials</h3>
                    <p>
                      Tap any appliance to edit its schedule and power draw.
                    </p>
                  </div>
                  <button className="primary" onClick={addAppliance}>
                    <Plus size={18} /> Add appliance
                  </button>
                </div>
                <div className="appliance-list">
                  {p.appliances.map((a, i) => (
                    <div className="appliance-row" key={a.id}>
                      <button
                        className={`switch ${a.enabled ? "on" : ""}`}
                        onClick={() =>
                          update({
                            appliances: p.appliances.map((x) =>
                              x.id === a.id ? { ...x, enabled: !x.enabled } : x,
                            ),
                          })
                        }
                        aria-label={`Enable ${a.name}`}
                        role="switch"
                        aria-checked={a.enabled}
                      >
                        <span />
                      </button>
                      <button
                        className="appliance-edit"
                        onClick={() => setModal(clone(a))}
                      >
                        <span className={`appliance-icon color-${i % 4}`}>
                          <PlugZap size={22} />
                        </span>
                        <span>
                          <b>{a.name}</b>
                          <small>
                            {a.quantity} × {a.watts} W · {a.hours} h ·{" "}
                            {Math.round(a.duty * 100)}% duty ·{" "}
                            {a.ac ? "AC" : "DC"}
                          </small>
                        </span>
                        <strong>{Math.round(applianceWh(a, p))} Wh</strong>
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              {(p.equipment || []).length > 0 && (
                <section className="panel source-list">
                  <h3>Charging & conversion equipment</h3>
                  <p>
                    Each item replaces its matching charging slot. It is never
                    counted as appliance draw.
                  </p>
                  {p.equipment!.map((e) => (
                    <button
                      key={e.id}
                      className="source-row"
                      onClick={() => setModal({ ...e })}
                    >
                      <span>
                        <b>{e.name}</b>
                        <small>
                          {e.slot} ·{" "}
                          {e.overridden
                            ? "User settings overridden"
                            : "Saved specifications"}{" "}
                          · tap to edit/remove
                        </small>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </section>
              )}
              <p className="help-note">
                Fridge duty cycle is the fraction of time its compressor runs,
                not a power reduction setting. Hot weather can raise it
                substantially.
              </p>
            </>
          )}
          {tab === "charging" && (
            <>
              <div className="form-grid">
                <section className="panel">
                  <div className="section-title">
                    <h3>
                      <Sun /> Solar & MPPT
                    </h3>
                    <span className="chip gold">
                      {wh(f.days[0].solarWh)}/day 1
                    </span>
                  </div>
                  <div className="fields">
                    {editNum("roofW", "Rooftop panels", "W", 50000)}
                    {editNum("blanketW", "Portable blanket", "W", 50000)}
                    {editNum("psh", "Clear-day peak sun hours", "h", 12, 0.25)}
                    {editNum("mpptA", "MPPT output limit", "A", 1000)}
                    <Slider
                      label="Combined solar yield"
                      value={Math.round(p.solarEfficiency * 100)}
                      onChange={(n) => update({ solarEfficiency: n / 100 })}
                    />
                  </div>
                  <p className="help-note">
                    Yield includes panel heat, angle, wiring and controller
                    losses. Weather is applied separately. This estimates
                    energy; it does not validate panel wiring or MPPT voltage
                    limits.
                  </p>
                </section>
                <section className="panel">
                  <h3>
                    <Car /> Alternator / DC-DC
                  </h3>
                  <div className="fields">
                    {editNum("dcdcA", "Charger output current", "A", 1000)}
                    {editNum("driveHours", "Driving per day", "h", 24, 0.25)}
                    {editNum(
                      "driveStart",
                      "Drive starts (24-hour)",
                      "h",
                      23.75,
                      0.25,
                    )}
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={p.shared}
                        onChange={(e) => update({ shared: e.target.checked })}
                      />{" "}
                      Solar and DC-DC share a controller
                    </label>
                    {p.shared &&
                      editNum(
                        "sharedA",
                        "Combined controller limit",
                        "A",
                        1000,
                      )}
                  </div>
                  <p className="help-note">
                    Savannah-X starts at an adjustable 30 A DC-DC setting.
                    Combined mode uses proportional limiting; your charger’s
                    actual source priority may differ. Verify its manual.
                  </p>
                </section>
                <section className="panel">
                  <h3>
                    <PlugZap /> Mains / generator
                  </h3>
                  <label className="field">
                    Charging source
                    <select
                      value={p.acSource}
                      onChange={(e) =>
                        update({
                          acSource: e.target.value as "mains" | "generator",
                        })
                      }
                    >
                      <option value="mains">Mains charger</option>
                      <option value="generator">
                        Generator → battery charger
                      </option>
                    </select>
                  </label>
                  <div className="fields">
                    {editNum("acA", "Battery charger output", "A", 1000)}
                    {editNum("acHours", "Charging per day", "h", 24, 0.25)}
                    {editNum(
                      "acStart",
                      "Charging starts (24-hour)",
                      "h",
                      23.75,
                      0.25,
                    )}
                  </div>
                  <p className="help-note">
                    Enter battery-side charger output, not generator watts.
                    Generator fuel use is not modelled.
                  </p>
                </section>
                <section className="panel">
                  <h3>
                    <BatteryCharging /> Battery & conversion limits
                  </h3>
                  <div className="fields">
                    {editNum(
                      "chargeVoltage",
                      "Charging voltage",
                      "V",
                      120,
                      0.1,
                    )}
                    {editNum(
                      "maxChargeA",
                      "Maximum total battery charge",
                      "A",
                      1000,
                    )}
                    <Slider
                      label="Charge efficiency"
                      min={10}
                      value={Math.round(p.chargeEfficiency * 100)}
                      onChange={(n) => update({ chargeEfficiency: n / 100 })}
                    />
                    <Slider
                      label="AC inverter efficiency"
                      min={10}
                      value={Math.round(p.inverterEfficiency * 100)}
                      onChange={(n) => update({ inverterEfficiency: n / 100 })}
                    />
                    {editNum("inverterIdleW", "Inverter idle draw", "W", 500)}
                  </div>
                  <p className="help-note">
                    No absorption taper, low-temperature charging protection or
                    BMS behaviour is simulated. Configure limits from your
                    battery specifications.
                  </p>
                </section>
              </div>
            </>
          )}
          {tab === "simulate" && (
            <>
              <section className="panel forecast-panel">
                <div className="section-title">
                  <div>
                    <h3>What if you stayed a little longer?</h3>
                    <p>
                      Power sliders are what-if changes; Apply saves them.
                      Weather settings save immediately.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setSim(clone(p))}
                  >
                    Reset
                  </button>
                </div>
                <div className="simulation-controls">
                  <Slider
                    label="Starting charge"
                    value={currentSim.soc}
                    onChange={(soc) => setSim({ ...clone(currentSim), soc })}
                  />
                  <Slider
                    label="Portable solar"
                    value={currentSim.blanketW}
                    max={1500}
                    step={25}
                    suffix=" W"
                    onChange={(blanketW) =>
                      setSim({ ...clone(currentSim), blanketW })
                    }
                  />
                  <Slider
                    label="Daily driving"
                    value={currentSim.driveHours}
                    max={12}
                    step={0.25}
                    suffix=" h"
                    onChange={(driveHours) =>
                      setSim({ ...clone(currentSim), driveHours })
                    }
                  />
                </div>
                <WeatherPanel
                  key={p.id}
                  profile={currentSim}
                  onSettings={(patch) => {
                    setStore((s) => ({
                      ...s,
                      profiles: s.profiles.map((x) =>
                        x.id === s.activeId
                          ? {
                              ...x,
                              weatherSettings: {
                                mode: "manual",
                                ...x.weatherSettings,
                                ...patch,
                              },
                            }
                          : x,
                      ),
                    }));
                    setSim((s) =>
                      s
                        ? {
                            ...s,
                            weatherSettings: {
                              mode: "manual",
                              ...s.weatherSettings,
                              ...patch,
                            },
                          }
                        : s,
                    );
                  }}
                  onManual={(weather) => {
                    setStore((s) => ({
                      ...s,
                      profiles: s.profiles.map((x) =>
                        x.id === s.activeId ? { ...x, weather } : x,
                      ),
                    }));
                    setSim((s) => (s ? { ...s, weather } : s));
                  }}
                />
                <Chart p={currentSim} />
                <div className="simulation-results">
                  <span>
                    Day 7 battery <b>{simulated.days[6].soc.toFixed(0)}%</b>
                  </span>
                  <span>
                    Lowest charge{" "}
                    <b>
                      {Math.min(...simulated.days.map((d) => d.minSoc)).toFixed(
                        0,
                      )}
                      %
                    </b>
                  </span>
                  <span>
                    Unserved demand{" "}
                    <b>
                      {wh(simulated.days.reduce((s, d) => s + d.unservedWh, 0))}
                    </b>
                  </span>
                  <button
                    className="primary"
                    disabled={!sim}
                    onClick={() => {
                      update(clone(currentSim));
                      setSim(null);
                      setNotice("Forecast applied to your setup.");
                    }}
                  >
                    <Check size={17} /> Apply to setup
                  </button>
                </div>
              </section>
              <section className="panel table-panel">
                <h3>Seven-day energy journal</h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Weather</th>
                        <th>Solar</th>
                        <th>DC-DC</th>
                        <th>
                          {currentSim.acSource === "mains"
                            ? "Mains"
                            : "Generator"}
                        </th>
                        <th>Use</th>
                        <th>Low / end</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulated.days.map((d, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>
                            {
                              weatherNames[
                                weatherForDay(
                                  currentSim.weatherSettings,
                                  currentSim.weather,
                                  i,
                                ).condition
                              ]
                            }
                          </td>
                          <td>{wh(d.solarWh)}</td>
                          <td>{wh(d.driveWh)}</td>
                          <td>{wh(d.acWh)}</td>
                          <td>{wh(d.loadWh)}</td>
                          <td className={d.reserveCrossed ? "low" : ""}>
                            {d.minSoc.toFixed(0)} / {d.soc.toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="help-note">
                  Solar, DC-DC and mains values are available bus energy after
                  controller caps, before charge efficiency. Full batteries and
                  charge-current limits may leave some energy unused.
                </p>
              </section>
            </>
          )}
          {tab === "settings" && (
            <>
              <div className="form-grid">
                <section className="panel">
                  <div className="section-title">
                    <h3>
                      <Car /> System configuration
                    </h3>
                    <span className="chip">
                      {store.profiles.length}/20 setups
                    </span>
                  </div>
                  <label className="field">
                    Setup name
                    <input
                      maxLength={80}
                      value={p.name}
                      onChange={(e) =>
                        update({ name: e.target.value || "My setup" })
                      }
                    />
                  </label>
                  <div className="fields">
                    <label className="field">
                      Battery chemistry
                      <select
                        value={p.chemistry}
                        onChange={(e) =>
                          update({
                            chemistry: e.target.value as Profile["chemistry"],
                          })
                        }
                      >
                        <option>LiFePO4</option>
                        <option>AGM</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <label className="field">
                      System voltage
                      <select
                        value={p.voltage}
                        onChange={(e) => {
                          const voltage = Number(e.target.value);
                          update({
                            voltage,
                            chargeVoltage:
                              voltage === 12 ? 14.4 : voltage * 1.125,
                          });
                        }}
                      >
                        {[12, 12.8, 24, 25.6, 48, 51.2].map((v) => (
                          <option key={v} value={v}>
                            {v} V
                          </option>
                        ))}
                      </select>
                    </label>
                    <NumberField
                      label="Total bank capacity"
                      value={p.ah}
                      onChange={(ah) => update({ ah })}
                      suffix="Ah"
                      min={1}
                    />
                    <Slider
                      label="Starting charge"
                      value={p.soc}
                      onChange={(soc) => update({ soc })}
                    />
                    <Slider
                      label="Reserve threshold"
                      value={p.reserve}
                      max={99}
                      onChange={(reserve) => update({ reserve })}
                    />
                  </div>
                  <p className="help-note">
                    Parallel: add Ah, keep voltage. Series: add voltage, keep
                    Ah. For Savannah-X, 2 × 300 Ah in parallel = 600 Ah at 12.8
                    V = 7.68 kWh. Reserve is a planning threshold, not a BMS
                    cut-off. AGM users should set an appropriate reserve.
                  </p>
                  <div className="button-row">
                    <button
                      className="secondary"
                      disabled={store.profiles.length >= 20}
                      onClick={() => {
                        const cp = {
                          ...clone(p),
                          id: crypto.randomUUID(),
                          name: `${p.name.slice(0, 70)} copy`,
                        };
                        setStore((s) => ({
                          ...s,
                          activeId: cp.id,
                          profiles: [...s.profiles, cp],
                        }));
                        setSim(null);
                        setNotice(
                          "Setup duplicated. Changes save automatically.",
                        );
                      }}
                    >
                      <Copy size={16} /> Duplicate
                    </button>
                    <button
                      className="text-button danger"
                      disabled={store.profiles.length === 1}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete ${p.name}? This cannot be undone.`,
                          )
                        ) {
                          setStore((s) => {
                            const profiles = s.profiles.filter(
                              (x) => x.id !== s.activeId,
                            );
                            return { ...s, profiles, activeId: profiles[0].id };
                          });
                          setSim(null);
                        }
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </section>
                <div className="stack">
                  <section className="panel">
                    <h3>
                      <Download /> Take your setup with you
                    </h3>
                    <p>
                      Back up all configurations and restore them on another
                      device. No login. No cloud required.
                    </p>
                    <div className="button-row">
                      <button className="primary" onClick={exportBackup}>
                        <Download size={17} /> Export backup
                      </button>
                      <button
                        className="secondary"
                        onClick={() => file.current?.click()}
                      >
                        <Upload size={17} /> Restore
                      </button>
                    </div>
                    <input
                      ref={file}
                      type="file"
                      hidden
                      accept="application/json,.json"
                      onChange={async (e) => {
                        const selected = e.target.files?.[0];
                        e.target.value = "";
                        if (!selected) return;
                        try {
                          if (selected.size > 2_000_000)
                            throw new Error("Backup exceeds 2 MB.");
                          setImported(parseBackup(await selected.text()));
                        } catch (err) {
                          setNotice(
                            err instanceof Error
                              ? err.message
                              : "Could not import backup.",
                          );
                        }
                      }}
                    />
                  </section>
                  <section className="panel pro-card">
                    <span className="tag">ON THE ROAD TO PRO</span>
                    <h3>More freedom. One upgrade.</h3>
                    <p>
                      Proposed A$14.99 lifetime upgrade. Prototype features are
                      open for testing. Purchases are not enabled yet.
                    </p>
                    <div className="pro-price">
                      A$14.99 <small>proposed lifetime price</small>
                    </div>
                    <p className="help-note">
                      Google Play purchase, restore and entitlement verification
                      must pass sandbox testing before a paid release.
                    </p>
                  </section>
                  <section className="panel">
                    <h3>Private by design</h3>
                    <p>
                      Manual planning needs no internet. Auto weather sends
                      rounded coordinates and your IP to MET Norway. Catalogue
                      refresh checks the public GitHub feed without sending
                      equipment selections. No analytics, advertising or account
                      requests are made. Your setups stay on this device until
                      you export them.
                    </p>
                    <p className="help-note">
                      Prototype 2 · Manual planning only · No Bluetooth or live
                      battery monitoring.
                    </p>
                  </section>
                </div>
              </div>
            </>
          )}
          <footer>
            <TentTree size={17} />
            <span>OffGrid Mate · Know your power. Enjoy your freedom.</span>
            <span>Prototype 2 · Estimates, not telemetry</span>
          </footer>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Main navigation">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => {
              setTab(t.id);
              window.scrollTo(0, 0);
            }}
          >
            <t.icon size={21} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Info size={18} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      <dialog
        aria-label="Appliance details"
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
      >
        {modal && (
          <EquipmentEditor
            key={modal.id}
            initial={modal}
            profile={p}
            templates={store.customEquipment || []}
            onClose={() => setModal(null)}
            onDeleteTemplate={(id) =>
              setStore((s) => ({
                ...s,
                customEquipment: (s.customEquipment || []).filter(
                  (t) => t.id !== id,
                ),
              }))
            }
            onRemove={() => {
              if ("slot" in modal) update(removeSource(p, modal));
              else
                update({
                  appliances: p.appliances.filter((x) => x.id !== modal.id),
                });
              setModal(null);
            }}
            onSave={(value, template) => {
              let next = { ...p };
              if ("slot" in value) {
                next = applySource(
                  {
                    ...p,
                    appliances: p.appliances.filter((a) => a.id !== value.id),
                  },
                  value,
                );
              } else {
                if ("slot" in modal) next = removeSource(p, modal);
                next = {
                  ...next,
                  appliances: next.appliances.some((a) => a.id === value.id)
                    ? next.appliances.map((a) =>
                        a.id === value.id ? value : a,
                      )
                    : [...next.appliances, value],
                };
              }
              if (!validProfile(next))
                throw new Error(
                  "Equipment values exceed the supported limits. Check quantity, voltage and output.",
                );
              if (
                template &&
                !(store.customEquipment || []).some(
                  (t) => t.id === template.id,
                ) &&
                (store.customEquipment || []).length >= 100
              )
                throw new Error(
                  "Maximum 100 saved custom items. Delete an unused saved copy first.",
                );
              setSim(null);
              setStore((s) => ({
                ...s,
                profiles: s.profiles.map((x) =>
                  x.id === s.activeId ? next : x,
                ),
                ...(template
                  ? {
                      customEquipment: [
                        ...(s.customEquipment || []).filter(
                          (t) => t.id !== template.id,
                        ),
                        template,
                      ],
                    }
                  : {}),
              }));
              setModal(null);
            }}
          />
        )}
      </dialog>
      <dialog
        ref={restoreDialog}
        role="alertdialog"
        aria-label="Confirm restore"
        onCancel={() => setImported(null)}
      >
        {imported && (
          <section className="confirm-dialog">
            <h3>Restore {imported.profiles.length} saved setups?</h3>
            <p>
              This replaces all setups currently on this device. Export your
              current backup first if you want to keep it.
            </p>
            <div className="button-row">
              <button
                className="primary"
                onClick={() => {
                  persistenceBlocked.current = false;
                  setStore(imported);
                  setImported(null);
                  setSim(null);
                  setNotice("Backup restored successfully.");
                }}
              >
                Replace & restore
              </button>
              <button className="secondary" onClick={() => setImported(null)}>
                Cancel
              </button>
            </div>
          </section>
        )}
      </dialog>
    </div>
  );
}
const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

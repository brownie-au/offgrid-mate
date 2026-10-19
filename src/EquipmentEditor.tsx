import { useEffect, useState } from "react";
import { Check, RefreshCw, Trash2 } from "lucide-react";
import { NumberField, Slider } from "./Controls";
import type { Appliance, Profile } from "./engine";
import {
  categories,
  isSource,
  toAppliance,
  type Category,
  type CustomTemplate,
  type EquipmentMeta,
  type Product,
  type SourceEquipment,
  type SourceSlot,
} from "./equipment";
import { readCatalogue, refreshCatalogue } from "./catalogue";
function draft(
  initial: Appliance | SourceEquipment,
  p: Profile,
): CustomTemplate {
  const source = "slot" in initial;
  return {
    id: initial.customId || crypto.randomUUID(),
    name: initial.name,
    brand: initial.brand || "",
    model: initial.model || "",
    category:
      initial.category ||
      (source
        ? initial.slot === "roof" || initial.slot === "blanket"
          ? "solar"
          : initial.slot
        : "other"),
    watts: initial.watts,
    amps: source ? initial.amps : 0,
    voltage: source
      ? initial.voltage
      : initial.inputVolts ||
        (p.voltage <= 16 ? 12 : p.voltage <= 30 ? 24 : 48),
    quantity: initial.quantity,
    hours: initial.hours,
    start: initial.start,
    duty: source ? 1 : initial.duty,
    ac: source ? false : initial.ac,
    dailyWh: initial.dailyWh || 0,
    energyMethod: initial.energyMethod || "power",
    idleW: source ? initial.idleW : p.inverterIdleW,
    efficiency: source ? initial.efficiency : p.inverterEfficiency,
    slot: source ? initial.slot : "blanket",
    shared: source ? initial.shared : false,
    priority: source ? initial.priority : "combined",
    sharedLimitA: source ? (initial.sharedLimitA ?? p.sharedA) : p.sharedA,
    mpptLimitA: source ? (initial.mpptLimitA ?? p.mpptA) : p.mpptA,
  };
}
export function EquipmentEditor({
  initial,
  profile,
  templates,
  onSave,
  onRemove,
  onClose,
  onDeleteTemplate,
}: {
  initial: Appliance | SourceEquipment;
  profile: Profile;
  templates: CustomTemplate[];
  onSave: (
    value: Appliance | SourceEquipment,
    template?: CustomTemplate,
  ) => void;
  onRemove: () => void;
  onClose: () => void;
  onDeleteTemplate: (id: string) => void;
}) {
  const [entry, setEntry] = useState(() => draft(initial, profile));
  const [data, setData] = useState(readCatalogue);
  const [brand, setBrand] = useState(
    initial.productId ? initial.brand || "" : "custom",
  );
  const [brandSearch, setBrandSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productId, setProductId] = useState(initial.productId || "");
  const [meta, setMeta] = useState<EquipmentMeta>({
    brand: initial.brand,
    model: initial.model,
    category: initial.category,
    productId: initial.productId,
    sourceUrl: initial.sourceUrl,
    verifiedAt: initial.verifiedAt,
    specNotes: initial.specNotes,
    basis: initial.basis,
    overridden: initial.overridden,
    peakW: initial.peakW,
  });
  const [saveCustom, setSaveCustom] = useState(!initial.productId);
  const [needsPower, setNeedsPower] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let live = true;
    const cache = readCatalogue();
    if (
      navigator.onLine &&
      (!cache.updatedAt || Date.now() - Date.parse(cache.updatedAt) > 86400000)
    ) {
      setBusy(true);
      refreshCatalogue()
        .then((next) => {
          if (live) {
            setData(next);
            setStatus(
              "Verified catalogue updated. Existing values and overrides were kept.",
            );
          }
        })
        .catch((e) => {
          if (live) setStatus((e as Error).message);
        })
        .finally(() => {
          if (live) setBusy(false);
        });
    }
    return () => {
      live = false;
    };
  }, []);
  const brands = [...new Set(data.products.map((p) => p.brand))].sort();
  const products = data.products.filter(
    (p) =>
      p.brand === brand &&
      p.model.toLowerCase().includes(productSearch.toLowerCase()),
  );
  const patch = (v: Partial<CustomTemplate>) => {
    setEntry((e) => ({ ...e, ...v }));
    setMeta((m) => ({ ...m, overridden: !!m.productId }));
    if ("watts" in v || "dailyWh" in v) setNeedsPower(false);
  };
  function selectProduct(product: Product) {
    const source = isSource(product.category);
    setEntry((e) => ({
      ...e,
      name: `${product.brand} ${product.model}`.slice(0, 80),
      brand: product.brand,
      model: product.model.slice(0, 80),
      category: product.category,
      watts:
        product.watts ??
        (product.category === "inverter"
          ? product.continuousW || 0
          : product.category === "fridge" && product.amps && product.voltage
            ? product.amps * product.voltage
            : 0),
      amps: product.amps || 0,
      voltage: product.voltage || (source ? 0 : e.voltage),
      idleW: product.idleW ?? e.idleW,
      efficiency: product.efficiency ?? e.efficiency,
      quantity: 1,
      ac: false,
      hours: source ? 0 : product.category === "fridge" ? 24 : 6,
      start: source ? 9 : product.category === "fridge" ? 0 : 9,
      duty: product.category === "fridge" ? 0.45 : 1,
      dailyWh: product.dailyWh || 0,
      energyMethod: product.dailyWh ? "daily" : "power",
      slot:
        product.category === "solar"
          ? "blanket"
          : source
            ? (product.category as SourceSlot)
            : e.slot,
      shared: !!product.shared,
      priority: product.priority || "combined",
      sharedLimitA: product.amps || profile.sharedA,
      mpptLimitA: product.amps || profile.mpptA,
    }));
    setMeta({
      productId: product.id,
      sourceUrl: product.sourceUrl,
      verifiedAt: product.verifiedAt,
      specNotes: product.notes,
      basis: product.basis,
      peakW: product.peakW,
      overridden: false,
    });
    setNeedsPower(
      !source &&
        product.watts === undefined &&
        product.dailyWh === undefined &&
        product.amps === undefined,
    );
    setProductId(product.id);
    setSaveCustom(false);
  }
  const num = (
    key: keyof CustomTemplate,
    label: string,
    suffix: string,
    max: number,
    min = 0,
    step = 1,
  ) => (
    <NumberField
      label={label}
      value={entry[key] as number}
      onChange={(n) => patch({ [key]: n })}
      suffix={suffix}
      min={min}
      max={max}
      step={step}
    />
  );
  const source = isSource(entry.category);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          if (needsPower)
            throw new Error(
              "Enter measured power or daily energy. No reliable consumption value was supplied.",
            );
          if (!entry.name.trim()) throw new Error("Enter an equipment name.");
          if (entry.energyMethod === "daily" && !source && entry.hours === 0)
            throw new Error(
              "Daily energy needs a non-zero operating period. Use 24 hours for a full-day measurement.",
            );
          const template = {
            ...entry,
            name: entry.name.trim(),
            quantity: Math.round(entry.quantity),
          };
          const evidence = {
            ...meta,
            brand: entry.brand,
            model: entry.model,
            category: entry.category,
            customId:
              brand === "custom" && saveCustom ? entry.id : initial.customId,
          };
          const value = source
            ? ({ ...template, ...evidence, id: initial.id } as SourceEquipment)
            : {
                ...toAppliance(template, evidence),
                id: initial.id,
                enabled: "enabled" in initial ? initial.enabled : true,
              };
          onSave(
            value,
            brand === "custom" && saveCustom ? template : undefined,
          );
        } catch (e) {
          setStatus((e as Error).message);
        }
      }}
    >
      <div className="section-title">
        <h3>Appliance details</h3>
        <button
          type="button"
          className="icon-button"
          aria-label="Close appliance editor"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="catalogue-header">
        <b>Choose your equipment</b>
        <small>
          {data.products.length} products · {brands.length} brands ·
          bundled/cached for offline use
        </small>
        <button
          type="button"
          className="text-button"
          disabled={busy || !navigator.onLine}
          onClick={async () => {
            setBusy(true);
            try {
              setData(await refreshCatalogue());
              setStatus(
                "Catalogue refreshed. Values you edited were preserved.",
              );
            } catch (e) {
              setStatus((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={14} />
          {busy ? "Refreshing catalogue…" : "Check for updates"}
        </button>
      </div>
      <div className="fields catalogue-fields">
        <div className="field">
          <label htmlFor="equipment-brand">Brand</label>
          <input
            type="search"
            aria-label="Search brands"
            placeholder="Search brands"
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
          />
          <select
            id="equipment-brand"
            aria-label="Brand"
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setProductId("");
              setMeta({});
              setNeedsPower(false);
              setSaveCustom(e.target.value === "custom");
              patch({
                brand: e.target.value === "custom" ? "" : e.target.value,
                model: "",
              });
            }}
          >
            <option value="custom">Custom / Not listed</option>
            {brands
              .filter(
                (b) =>
                  b.toLowerCase().includes(brandSearch.toLowerCase()) ||
                  b === brand,
              )
              .map((b) => (
                <option key={b}>{b}</option>
              ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="equipment-product">Product / Model</label>
          <input
            type="search"
            aria-label="Search products"
            placeholder="Search models"
            value={productSearch}
            disabled={brand === "custom"}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          <select
            id="equipment-product"
            aria-label="Product / Model"
            value={productId}
            disabled={brand === "custom"}
            onChange={(e) => {
              const p = data.products.find(
                (p) => p.id === e.target.value && p.brand === brand,
              );
              if (p) selectProduct(p);
            }}
          >
            <option value="">
              {brand === "custom"
                ? "Enter your own details below"
                : "Select a verified product"}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.model}
              </option>
            ))}
          </select>
        </div>
      </div>
      {brand === "custom" && templates.length > 0 && (
        <div className="custom-library">
          <label className="field">
            Reuse saved custom equipment
            <select
              aria-label="Reuse saved custom equipment"
              value=""
              onChange={(e) => {
                const t = templates.find((t) => t.id === e.target.value);
                if (t) {
                  setEntry({ ...t });
                  setMeta({});
                  setNeedsPower(false);
                }
              }}
            >
              <option value="">Choose a saved item…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <details>
            <summary>Manage saved custom items</summary>
            {templates.map((t) => (
              <div className="custom-template" key={t.id}>
                <span>{t.name}</span>
                <button
                  type="button"
                  className="text-button danger"
                  aria-label={`Delete saved ${t.name}`}
                  onClick={() => onDeleteTemplate(t.id)}
                >
                  Delete saved copy
                </button>
              </div>
            ))}
          </details>
        </div>
      )}
      {meta.sourceUrl && (
        <div className="spec-evidence">
          <b>
            {meta.overridden
              ? "User override · original source retained"
              : "Manufacturer specifications"}
          </b>
          <small>{meta.basis}</small>
          <p>{meta.specNotes}</p>
          <a href={meta.sourceUrl} target="_blank" rel="noreferrer">
            View manufacturer source
          </a>
          <small>
            Verified {meta.verifiedAt} · Startup/peak is unknown unless stated.
          </small>
          {meta.peakW !== undefined && (
            <small>
              Published peak: {meta.peakW} W (see source conditions)
            </small>
          )}
        </div>
      )}
      {needsPower && (
        <p className="warning">
          Verified consumption is unavailable. Enter measured watts or measured
          daily Wh before saving.
        </p>
      )}
      <label className="field">
        Appliance name
        <input
          required
          maxLength={80}
          value={entry.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </label>
      {brand === "custom" && (
        <div className="fields">
          <label className="field">
            Optional brand
            <input
              maxLength={80}
              value={entry.brand}
              onChange={(e) => patch({ brand: e.target.value })}
            />
          </label>
          <label className="field">
            Optional model
            <input
              maxLength={80}
              value={entry.model}
              onChange={(e) => patch({ model: e.target.value })}
            />
          </label>
          <label className="field">
            Equipment category
            <select
              aria-label="Equipment category"
              value={entry.category}
              onChange={(e) => {
                const category = e.target.value as Category;
                patch({
                  category,
                  slot:
                    category === "solar"
                      ? "blanket"
                      : isSource(category)
                        ? (category as SourceSlot)
                        : entry.slot,
                });
              }}
            >
              {Object.entries(categories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {!source ? (
        <>
          <label className="field">
            Consumption method
            <select
              aria-label="Consumption method"
              value={entry.energyMethod}
              onChange={(e) =>
                patch({ energyMethod: e.target.value as "power" | "daily" })
              }
            >
              <option value="power">Watts × hours × duty cycle</option>
              <option value="daily">Measured daily energy (Wh/day)</option>
            </select>
          </label>
          <div className="fields">
            {entry.energyMethod === "power"
              ? num("watts", "Running power", "W", 50000)
              : num("dailyWh", "Daily appliance energy", "Wh/day", 1_000_000)}
            {num("hours", "Hours per day", "h", 24, 0, 0.25)}
            {num("start", "Starts at (24-hour)", "h", 23.75, 0, 0.25)}
            {num("quantity", "Quantity", "", 100, 1)}
            {num("voltage", "Appliance input voltage", "V", 1000, 1, 0.1)}
          </div>
          {entry.energyMethod === "power" && (
            <Slider
              label="Duty cycle (planning estimate)"
              value={Math.round(entry.duty * 100)}
              onChange={(n) => patch({ duty: n / 100 })}
            />
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={entry.ac}
              onChange={(e) => patch({ ac: e.target.checked })}
            />{" "}
            Runs through an AC inverter
          </label>
          <p className="help-note">
            Daily Wh replaces watts × duty; it is not added a second time. Enter
            appliance-side energy before any external inverter loss. Duty-cycle
            estimates are not manufacturer-verified daily consumption.
          </p>
        </>
      ) : (
        <>
          <label className="field">
            Charging / conversion slot
            <select
              aria-label="Charging slot"
              value={entry.slot}
              onChange={(e) => patch({ slot: e.target.value as SourceSlot })}
            >
              {entry.category === "solar" ? (
                <>
                  <option value="roof">Rooftop solar total</option>
                  <option value="blanket">Portable solar total</option>
                </>
              ) : (
                <option value={entry.category}>
                  {categories[entry.category]}
                </option>
              )}
            </select>
          </label>
          <div className="fields">
            {entry.category === "solar" ? (
              num("watts", "Rated panel output (STC)", "W", 50000)
            ) : entry.category === "inverter" ? (
              <>
                {num("idleW", "Inverter idle draw", "W", 500)}
                <Slider
                  label="Inverter planning efficiency"
                  min={10}
                  value={Math.round(entry.efficiency * 100)}
                  onChange={(n) => patch({ efficiency: n / 100 })}
                />
              </>
            ) : (
              num("amps", "Battery charger output current", "A", 1000)
            )}
            {num(
              "voltage",
              entry.category === "solar"
                ? "Panel Vmp (if known)"
                : "Nominal battery output voltage",
              "V",
              1000,
              entry.category === "solar" ? 0 : 1,
              0.1,
            )}
            {entry.category !== "inverter" &&
              num("quantity", "Quantity", "", 100, 1)}
            {["dcdc", "mains"].includes(entry.category) && (
              <>
                {num(
                  "hours",
                  entry.category === "dcdc"
                    ? "Driving per day"
                    : "Charging per day",
                  "h",
                  24,
                  0,
                  0.25,
                )}
                {num("start", "Starts at (24-hour)", "h", 23.75, 0, 0.25)}
              </>
            )}
          </div>
          {entry.category === "dcdc" && (
            <>
              <label className="check">
                <input
                  type="checkbox"
                  checked={entry.shared}
                  onChange={(e) => patch({ shared: e.target.checked })}
                />{" "}
                Shares controller with solar (MPPT)
              </label>
              {entry.shared && (
                <div className="fields">
                  {num(
                    "sharedLimitA",
                    "Combined controller output limit",
                    "A",
                    1000,
                  )}
                  {num("mpptLimitA", "MPPT output limit", "A", 1000)}
                </div>
              )}
              {entry.shared && (
                <label className="field">
                  Source priority approximation
                  <select
                    aria-label="Source priority"
                    value={entry.priority}
                    onChange={(e) =>
                      patch({
                        priority: e.target.value as "solar" | "combined",
                      })
                    }
                  >
                    <option value="combined">
                      Combined, limited total current
                    </option>
                    <option value="solar">
                      Solar priority (no alternator while solar is available)
                    </option>
                  </select>
                </label>
              )}
            </>
          )}
          <p className="warning">
            Saving replaces the current {entry.slot} slot, including its numeric
            settings. It does not add a consuming appliance. Output ratings are
            not continuous consumption. Verify hardware compatibility
            separately.
          </p>
        </>
      )}
      {brand === "custom" && (
        <label className="check">
          <input
            type="checkbox"
            checked={saveCustom}
            onChange={(e) => setSaveCustom(e.target.checked)}
          />{" "}
          Save/update this custom item for reuse
        </label>
      )}
      {status && (
        <p className="weather-message" role="status">
          {status}
        </p>
      )}
      <div className="button-row">
        <button type="submit" className="primary">
          <Check size={17} />
          {source ? "Save charging equipment" : "Save appliance"}
        </button>
        <button type="button" className="text-button danger" onClick={onRemove}>
          <Trash2 size={16} /> Remove
        </button>
      </div>
    </form>
  );
}

import { useEffect, useRef, useState } from "react";
import { CloudSun, MapPin, RefreshCw } from "lucide-react";
import type { Profile } from "./engine";
import {
  deviceLocation,
  fetchWeather,
  locationFrom,
  places,
  weatherFactors,
  weatherForDay,
  dayKey,
  sameLocation,
  type Weather,
  type WeatherSettings,
} from "./weather";
const names: Record<Weather, string> = {
  sunny: "Sunny",
  mixed: "Partly cloudy",
  overcast: "Overcast",
  rain: "Rain",
};
export function WeatherPanel({
  profile,
  onSettings,
  onManual,
}: {
  profile: Profile;
  onSettings: (patch: Partial<WeatherSettings>) => void;
  onManual: (weather: Weather[]) => void;
}) {
  const settings = profile.weatherSettings || { mode: "manual" };
  const [online, setOnline] = useState(navigator.onLine);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [label, setLabel] = useState(settings.location?.name || "");
  const [lat, setLat] = useState(String(settings.location?.lat ?? ""));
  const [lon, setLon] = useState(String(settings.location?.lon ?? ""));
  const [clock, setClock] = useState(Date.now());
  const mounted = useRef(true);
  const latest = useRef(settings);
  latest.current = settings;
  const change = useRef(onSettings);
  change.current = onSettings;
  const pending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const network = () => setOnline(navigator.onLine);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    const t = setInterval(() => setClock(Date.now()), 60000);
    return () => {
      mounted.current = false;
      clearInterval(t);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
    };
  }, []);
  async function refresh() {
    const s = latest.current;
    if (!s.location || pending.current) return;
    if (!navigator.onLine) {
      setMessage(
        "Offline. Using cached forecast where dates match; otherwise saved Manual assumptions.",
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    setMessage("Updating local forecast…");
    try {
      const cache = await fetchWeather(s.location, s.cache);
      if (
        mounted.current &&
        sameLocation(latest.current.location, s.location)
      ) {
        change.current({ cache });
        setMessage("Forecast checked. Provider cache expiry is respected.");
      }
    } catch (e) {
      if (mounted.current)
        setMessage(
          e instanceof Error
            ? e.message
            : "Weather unavailable. Cached data and Manual settings are preserved.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (settings.mode === "auto" && settings.location && online) void refresh();
  }, [settings.mode, settings.location?.lat, settings.location?.lon, online]);
  const cache = sameLocation(settings.location, settings.cache?.location)
    ? settings.cache
    : undefined;
  const stale = !!cache && Date.parse(cache.expiresAt) < clock;
  const age = cache
    ? Math.max(0, Math.floor((clock - Date.parse(cache.fetchedAt)) / 60000))
    : 0;
  return (
    <div className="weather-panel">
      <div className="section-title">
        <div>
          <h3>
            <CloudSun /> Weather for your escape
          </h3>
          <p>Manual works offline. Auto uses a real local forecast.</p>
        </div>
        <div
          className="segmented"
          role="group"
          aria-label="Weather forecast mode"
        >
          {(["auto", "manual"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              aria-pressed={settings.mode === mode}
              onClick={() => onSettings({ mode })}
            >
              {mode === "auto" ? "Auto" : "Manual"}
            </button>
          ))}
        </div>
      </div>
      {settings.mode === "auto" && (
        <>
          <div className="weather-location">
            <label className="field">
              Forecast location
              <input
                aria-label="Forecast location"
                list="camp-places"
                value={label}
                placeholder="Choose a listed place or name your coordinates"
                maxLength={80}
                onChange={(e) => {
                  setLabel(e.target.value);
                  const match = places.find(
                    (p) => p[0].toLowerCase() === e.target.value.toLowerCase(),
                  );
                  if (match) {
                    setLat(String(match[1]));
                    setLon(String(match[2]));
                  }
                }}
              />
              <datalist id="camp-places">
                {places.map((p) => (
                  <option key={p[0]} value={p[0]} />
                ))}
              </datalist>
            </label>
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMessage("Requesting location permission…");
                try {
                  const location = await deviceLocation();
                  if (!mounted.current) return;
                  setLabel(location.name);
                  setLat(String(location.lat));
                  setLon(String(location.lon));
                  onSettings({ location });
                  setMessage("Location set.");
                } catch (e) {
                  if (mounted.current) setMessage((e as Error).message);
                } finally {
                  if (mounted.current) setBusy(false);
                }
              }}
            >
              <MapPin size={16} /> Use device location
            </button>
          </div>
          <div className="location-coordinates">
            <label className="field">
              Latitude
              <input
                aria-label="Latitude"
                type="number"
                min={-90}
                max={90}
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </label>
            <label className="field">
              Longitude
              <input
                aria-label="Longitude"
                type="number"
                min={-180}
                max={180}
                step="any"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
              />
            </label>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                try {
                  if (lat.trim() === "" || lon.trim() === "")
                    throw new Error(
                      "Choose a listed place or enter both coordinates.",
                    );
                  onSettings({
                    location: locationFrom(label, Number(lat), Number(lon)),
                  });
                  setMessage("Location saved.");
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              Set location
            </button>
            <button
              className="secondary"
              disabled={busy || !settings.location || !online}
              onClick={() => void refresh()}
            >
              <RefreshCw size={16} />
              {busy ? "Loading…" : "Refresh"}
            </button>
          </div>
          <p className="help-note">
            Listed places resolve offline. For anywhere else, enter a name and
            coordinates. Auto sends rounded coordinates and your IP to MET
            Norway; GPS is requested only when you tap the location button.
          </p>
          <div
            className={`weather-status ${!online || stale ? "weather-stale" : ""}`}
            role="status"
          >
            {!online ? "Offline · " : ""}
            {cache
              ? `${stale ? "Stale cached forecast" : "Cached forecast"} · ${settings.location?.name} · checked ${age} min ago (${new Date(cache.fetchedAt).toLocaleString()}) · model issued ${new Date(cache.modelUpdatedAt).toLocaleString()}`
              : "No cached forecast for this location. Saved Manual assumptions are being used."}
            {!cache && (
              <button
                className="text-button"
                onClick={() => onSettings({ mode: "manual" })}
              >
                Use Manual
              </button>
            )}
          </div>
          {message && (
            <p role="status" className="weather-message">
              {message}
            </p>
          )}
          <p className="help-note">
            Auto solar estimate uses cloud cover weighted over approximate
            daylight (06:00–18:00 local time): 1 − 0.75 × (cloud fraction)³,
            limited to 25–100% of your clear-day solar setting. It is a planning
            proxy, not irradiance. Rain icons do not directly set solar output.
            Dates use {settings.location?.timezone || "the device timezone"}.
            Partial days use the available hours.
          </p>
        </>
      )}
      {settings.mode === "manual" && (
        <p className="help-note">
          Sunny 100% · Partly cloudy 65% · Overcast 30% · Rain 10% of your
          clear-day solar estimate. These are editable scenarios, not precise
          weather predictions. Changes save immediately.
        </p>
      )}
      <div className="weather-strip">
        {profile.weather.map((w, i) => {
          const day = weatherForDay(
            settings,
            profile.weather,
            i,
            new Date(clock),
          );
          return (
            <label key={i}>
              <span>
                {settings.mode === "auto" && settings.location
                  ? dayKey(
                      i,
                      settings.location.timezone,
                      new Date(clock),
                    ).slice(5)
                  : `DAY ${i + 1}`}
              </span>
              {settings.mode === "manual" ? (
                <select
                  aria-label={`Day ${i + 1} weather`}
                  value={w}
                  onChange={(e) => {
                    const weather = [...profile.weather];
                    weather[i] = e.target.value as Weather;
                    onManual(weather);
                  }}
                >
                  {Object.entries(names).map(([v, name]) => (
                    <option key={v} value={v}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <b>{names[day.condition]}</b>
                  <small>
                    {day.record
                      ? `${Math.round(day.record.minC)}–${Math.round(day.record.maxC)}°C · ${day.record.rainMm.toFixed(1)} mm`
                      : "Manual fallback"}
                  </small>
                  <small>
                    {day.record
                      ? `${Math.round(day.record.cloud)}% cloud · ${day.record.hours} h available`
                      : ""}
                  </small>
                </>
              )}
              <small>Solar × {day.factor.toFixed(2)}</small>
            </label>
          );
        })}
      </div>
      {settings.mode === "auto" && (
        <p className="attribution">
          Weather:{" "}
          <a href="https://www.met.no/" target="_blank" rel="noreferrer">
            MET Norway
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>{" "}
          · Aggregated and converted into planning estimates by OffGrid Mate.
        </p>
      )}
    </div>
  );
}

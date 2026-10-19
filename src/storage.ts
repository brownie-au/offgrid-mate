import { validTemplate, type CustomTemplate } from "./equipment";
import { clone, defaultProfile, validProfile, type Profile } from "./engine";
export const STORAGE_KEY = "offgrid-mate:v1";
export type Store = {
  version: 1;
  customEquipment?: CustomTemplate[];
  activeId: string;
  profiles: Profile[];
  theme: "light" | "dark";
};
export function initialStore(): Store {
  return {
    version: 1,
    activeId: defaultProfile.id,
    profiles: [clone(defaultProfile)],
    theme: "light",
  };
}
export function parseBackup(text: string): Store {
  if (text.length > 2_000_000)
    throw new Error("Backup is too large (maximum 2 MB).");
  const v = JSON.parse(text) as Store;
  if (
    v.version !== 1 ||
    (v.customEquipment !== undefined &&
      (!Array.isArray(v.customEquipment) ||
        v.customEquipment.length > 100 ||
        !v.customEquipment.every(validTemplate) ||
        new Set(v.customEquipment.map((t) => t.id)).size !==
          v.customEquipment.length)) ||
    !Array.isArray(v.profiles) ||
    !v.profiles.length ||
    v.profiles.length > 20 ||
    !v.profiles.every(validProfile) ||
    new Set(v.profiles.map((p) => p.id)).size !== v.profiles.length ||
    !v.profiles.some((p) => p.id === v.activeId) ||
    !["light", "dark"].includes(v.theme)
  )
    throw new Error(
      "This is not a valid OffGrid Mate v1 backup. Your setups have not been changed.",
    );
  return v;
}
export function readStore(): { store: Store; error?: string } {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return { store: text ? parseBackup(text) : initialStore() };
  } catch {
    return {
      store: initialStore(),
      error:
        "Saved data could not be read. A temporary default is shown; export a backup before making changes.",
    };
  }
}
export function writeStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

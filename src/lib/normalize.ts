/** Rechtsformen und Füllwörter, die beim Dublettenvergleich ignoriert werden. */
const LEGAL_FORMS = [
  "gesellschaft m b h",
  "gesellschaft mbh",
  "ges m b h",
  "gesmbh",
  "gmbh co kg",
  "gmbh",
  "co kg",
  "kg",
  "og",
  "ag",
  "e u",
  "eu",
];

/** Normalisiert einen Firmennamen für die Dublettenprüfung. */
export function normalizeName(name: string): string {
  let s = name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  for (const form of LEGAL_FORMS) {
    s = s.replace(new RegExp(`(^| )${form}( |$)`, "g"), " ").trim();
  }
  return s.replace(/\s+/g, " ");
}

/** „offen“, leer oder Bindestrich gilt als fehlende Angabe. */
export function isOpen(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v === "" || v === "offen" || v === "-" || v === "–";
}

/** Zerlegt ein Telefon-Feld in wählbare Nummern, z. B. „07242 00001 (Wasser) / 07242 00002 (Elektro)“. */
export function parsePhones(value: string): { label: string; tel: string }[] {
  if (isOpen(value)) return [];
  return value
    .split(/\s*[/;]\s*|\s*,\s*(?=\+|0)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const digits = part.replace(/\(.*?\)/g, "").replace(/[^\d+]/g, "");
      const tel = digits.startsWith("0") && !digits.startsWith("00") ? `+43${digits.slice(1)}` : digits;
      return { label: part, tel };
    })
    .filter((p) => p.tel.replace(/\D/g, "").length >= 6);
}

/** Macht aus „demo-elektro.at“ eine klickbare URL. */
export function toUrl(value: string): string | undefined {
  if (isOpen(value)) return undefined;
  const v = value.trim().split(/[\s,]+/)[0] ?? "";
  if (!/[a-z0-9-]+\.[a-z]{2,}/i.test(v)) return undefined;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

const WARN_WORDS = ["⚠", "insolven", "konkurs", "verstorben", "todesfall", "tod ", "sanierungsverfahren"];

/** Sensibler Hintergrund? Dann wird der Hinweis rot angezeigt. */
export function hasWarning(hinweis: string): boolean {
  const h = hinweis.toLowerCase();
  return WARN_WORDS.some((w) => h.includes(w));
}

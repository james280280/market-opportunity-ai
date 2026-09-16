export const normalizeCsvEntries = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const normalizeLooseText = (value: string) => value.toLowerCase().replace(/\s+/g, "").trim();

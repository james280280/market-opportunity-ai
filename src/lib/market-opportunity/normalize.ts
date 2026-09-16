export const normalizeCsvEntries = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const normalizeCsvEntries = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const normalizeLooseText = (value: string) =>
  value.normalize("NFKC").toLowerCase().replace(/\s+/g, "").trim();

const skillAliasMap: Record<string, string> = {
  "営業": "sales",
  "セールス": "sales",
  "sales": "sales",
  "運用": "operations",
  "オペレーション": "operations",
  "operations": "operations",
  "ai": "ai",
  "人工知能": "ai",
  "プロダクト": "product",
  "商品企画": "product",
  "プロダクト開発": "product",
  "product": "product",
  "hardware": "hardware",
  "ハードウェア": "hardware",
  "medical": "medical",
  "医療": "medical",
};

export const normalizeSkill = (value: string) => {
  const normalized = normalizeLooseText(value);
  return skillAliasMap[normalized] ?? normalized;
};

export const normalizeSkillList = (values: string[]) => values.map(normalizeSkill).filter(Boolean);

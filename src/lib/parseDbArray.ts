export const parseDbArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  if (typeof value !== "string") return [];
  const raw = value.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  } catch {
    // Support Postgres text[] literals such as {"A","B","C"}.
    if (!(raw.startsWith("{") && raw.endsWith("}"))) return [];
    const body = raw.slice(1, -1);
    if (!body) return [];

    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    let escaped = false;

    for (let i = 0; i < body.length; i += 1) {
      const char = body[i];
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        const entry = current.trim();
        if (entry) values.push(entry);
        current = "";
        continue;
      }
      current += char;
    }

    const finalEntry = current.trim();
    if (finalEntry) values.push(finalEntry);
    return values;
  }
};

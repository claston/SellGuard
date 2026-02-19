export function normalizeContent(rawContent) {
  const input = typeof rawContent === "string" ? rawContent : "";
  return input.replace(/\s+/g, " ").trim();
}

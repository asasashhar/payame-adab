export type CustomPage = { slug: string; title: string; content: string; visible: boolean };

export function customPagesFromSettings(s: Record<string, string>): CustomPage[] {
  try {
    const parsed = JSON.parse(s.customPages ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.slug === "string" && typeof p.title === "string")
      .map((p) => ({
        slug: String(p.slug),
        title: String(p.title),
        content: String(p.content ?? ""),
        visible: p.visible !== false,
      }));
  } catch {
    return [];
  }
}

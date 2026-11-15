import type { NavItemConfig, PortalConfig } from '../content/siteDefaults';

export interface BaseNavItem {
  path: string;
  label: string;
}

export function resolvePortalNav<T extends BaseNavItem>(
  base: T[],
  config: NavItemConfig[],
): (T & { hidden: boolean })[] {
  const byPath = new Map(base.map((item) => [item.path, item]));
  const seen = new Set<string>();
  const ordered: (T & { hidden: boolean })[] = [];

  for (const item of config) {
    const match = byPath.get(item.path);
    if (!match || seen.has(item.path)) continue;
    seen.add(item.path);
    ordered.push({ ...match, label: item.label || match.label, hidden: !!item.hidden });
  }

  for (const item of base) {
    if (!seen.has(item.path)) ordered.push({ ...item, hidden: false });
  }

  return ordered.filter((item) => !item.hidden);
}

export function portalBackground(portal: PortalConfig, brandAccent: string): string {
  const accent = portal.accent || brandAccent || '#047857';
  if (portal.sidebarStyle === 'solid') return accent;
  if (portal.sidebarStyle === 'midnight') return '#0f172a';
  return `linear-gradient(to bottom, ${accent}, #064e3b 58%, #0f172a)`;
}

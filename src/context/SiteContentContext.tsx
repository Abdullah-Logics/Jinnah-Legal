import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import api from '../utils/api';
import {
  cloneSiteContent, defaultSiteContent, mergeSiteContent, type SiteContent,
} from '../content/siteDefaults';

const CACHE_KEY = 'jinnah-site-content-v1';

interface SiteContentContextValue {
  content: SiteContent;
  loading: boolean;
  saving: boolean;
  error: string;
  savedAt: string | null;
  refresh: () => Promise<void>;
  save: (next: SiteContent) => Promise<boolean>;
  resetLocal: () => void;
}

const SiteContentContext = createContext<SiteContentContextValue>({
  content: defaultSiteContent,
  loading: false,
  saving: false,
  error: '',
  savedAt: null,
  refresh: async () => {},
  save: async () => false,
  resetLocal: () => {},
});

function readCache(): SiteContent {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return mergeSiteContent(JSON.parse(raw));
  } catch {}
  return cloneSiteContent(defaultSiteContent);
}

function writeCache(content: SiteContent) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(content)); } catch {}
}

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(readCache);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ content: unknown; updatedAt?: string | null }>('/api/site/content');
      if (data?.content) {
        const merged = mergeSiteContent(data.content);
        setContent(merged);
        writeCache(merged);
        setSavedAt(data.updatedAt || null);
      }
    } catch {
      // Offline or API unavailable — cached/default content keeps the site usable.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async (next: SiteContent) => {
    setSaving(true);
    setError('');
    try {
      const normalized = mergeSiteContent(next);
      await api.put('/api/site/content', { content: normalized });
      setContent(normalized);
      writeCache(normalized);
      setSavedAt(new Date().toISOString());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save site content.');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const resetLocal = useCallback(() => {
    const defaults = cloneSiteContent(defaultSiteContent);
    setContent(defaults);
    writeCache(defaults);
  }, []);

  const value = useMemo<SiteContentContextValue>(() => ({
    content, loading, saving, error, savedAt, refresh, save, resetLocal,
  }), [content, loading, saving, error, savedAt, refresh, save, resetLocal]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}

const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

export function resolveUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/') && API) return `${API}${url}`;
  return url;
}

export function avatarUrl(user: { avatar?: string | null; name?: string } | null | undefined): string {
  if (!user) return '';
  if (user.avatar) return resolveUrl(user.avatar);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=059669&color=fff&size=120`;
}

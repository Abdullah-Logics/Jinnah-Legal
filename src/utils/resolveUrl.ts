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

export function downloadFile(url: string, filename: string) {
  if (url.startsWith('data:')) {
    const [meta, b64] = url.split(',');
    const mime = meta.match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const byteString = atob(b64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mime });
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objUrl);
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

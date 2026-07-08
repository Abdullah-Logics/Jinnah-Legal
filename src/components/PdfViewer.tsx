import { useEffect, useState, useRef } from 'react';
import { X, Download, Loader } from 'lucide-react';
import { downloadFile } from '../utils/resolveUrl';

interface PdfViewerProps {
  url: string;
  name: string;
  onClose: () => void;
}

export default function PdfViewer({ url, name, onClose }: PdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const blobUrlRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Fetch failed');
        return r.blob();
      })
      .then(blob => {
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setBlobUrl(blobUrl);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [url]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <h3 className="font-semibold text-sm truncate flex-1 min-w-0 mr-2">{name}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => downloadFile(url, name)} className="p-1.5 hover:bg-slate-100 rounded-lg transition" title="Download">
              <Download size={16} className="text-slate-500" />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
              <X size={18} className="text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-slate-100">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader size={24} className="text-slate-400 animate-spin" />
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-sm text-slate-500">
              <p>Failed to load PDF</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">
                Open in new tab
              </a>
            </div>
          )}
          {blobUrl && !error && (
            <embed src={blobUrl} type="application/pdf" className="w-full h-full" />
          )}
        </div>
      </div>
    </div>
  );
}

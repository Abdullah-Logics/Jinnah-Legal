import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<>"'()]+|www\.[^\s<>"'()]+)/g;
const BOLD_REGEX = /(\*\*[^*]+\*\*)/g;

function renderPlain(part: string, keyPrefix: string, tone: 'dark' | 'light') {
  const parts = part.split(URL_REGEX);
  return parts.map((p, i) => {
    if (i % 2 === 1) {
      const href = p.startsWith('www.') ? `https://${p}` : p;
      return (
        <a
          key={`${keyPrefix}-u${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`font-semibold break-all ${tone === 'light' ? 'text-emerald-300 hover:text-emerald-200 hover:underline underline-offset-2' : 'text-emerald-600 hover:text-emerald-700 hover:underline underline-offset-2'}`}
        >
          {p}
        </a>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t${i}`}>{p}</React.Fragment>;
  });
}

export default function LinkifiedText({ text, className, tone = 'dark' }: { text: string; className?: string; tone?: 'dark' | 'light' }) {
  const segments = String(text ?? '').split(BOLD_REGEX);
  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (i % 2 === 1 && seg.startsWith('**') && seg.endsWith('**')) {
          return (
            <strong key={`b${i}`} className="font-bold">
              {renderPlain(seg.slice(2, -2), `b${i}`, tone)}
            </strong>
          );
        }
        return <React.Fragment key={`s${i}`}>{renderPlain(seg, `s${i}`, tone)}</React.Fragment>;
      })}
    </span>
  );
}

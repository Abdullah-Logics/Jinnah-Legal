import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<>"'()]+|www\.[^\s<>"'()]+)/g;

export default function LinkifiedText({ text, className, tone = 'dark' }: { text: string; className?: string; tone?: 'dark' | 'light' }) {
  const parts = text.split(URL_REGEX);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const href = part.startsWith('www.') ? `https://${part}` : part;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`font-semibold break-all ${tone === 'light' ? 'text-emerald-300 hover:text-emerald-200 hover:underline underline-offset-2' : 'text-emerald-600 hover:text-emerald-700 hover:underline underline-offset-2'}`}
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}

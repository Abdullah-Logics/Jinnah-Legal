import { useRef, useState } from 'react';
import { Mic, Loader } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  size?: number;
  className?: string;
}

const SpeechRecognitionImpl =
  (typeof window !== 'undefined' && (window as any).SpeechRecognition) ||
  (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) ||
  null;

export default function VoiceInput({ onTranscript, size = 18, className = '' }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [unsupported] = useState(() => !SpeechRecognitionImpl);
  const recRef = useRef<any>(null);

  if (unsupported) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = SpeechRecognitionImpl;
    if (!Recognition) return;
    const rec = new Recognition();
    recRef.current = rec;
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        onTranscript(e.results[i][0].transcript, e.results[i].isFinal);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try { rec.start(); setListening(true); } catch { setListening(false); }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Stop listening' : 'Speak to type'}
      className={`h-12 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors ${
        listening ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      } ${className}`}
    >
      {listening ? <Loader size={size} className="animate-spin" /> : <Mic size={size} />}
    </button>
  );
}

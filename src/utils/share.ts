import { useStore } from '../store/useStore';

interface SharePayload {
  type: 'hearing' | 'document' | 'journal' | 'todo' | 'calendar' | 'case';
  title: string;
  description?: string;
  details?: Record<string, any>;
}

export async function shareInChat(receiverId: string, payload: SharePayload) {
  const { sendMessage } = useStore.getState();
  await sendMessage({
    receiverId,
    content: '',
    shareData: JSON.stringify(payload),
  });
}

let toastTimeout: ReturnType<typeof setTimeout>;

export function notifyError(msg: string) { notify(msg, true); }

export function notify(msg: string, isError = false) {
  clearTimeout(toastTimeout);
  const existing = document.getElementById('share-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'share-toast';
  el.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] ${isError ? 'bg-red-700' : 'bg-emerald-700'} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium`;
  el.style.transition = 'opacity 0.3s';
  el.textContent = msg;
  document.body.appendChild(el);
  toastTimeout = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

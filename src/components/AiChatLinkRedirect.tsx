import { Navigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function AiChatLinkRedirect() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, currentUser } = useStore();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(`/chat/ai/${id}`)}`} replace />;
  }

  if (currentUser.role === 'lawyer') {
    return <Navigate to={`/lawyer/ai-brain?fork=${id}`} replace />;
  }
  if (currentUser.role === 'client') {
    return <Navigate to={`/client/ai-assistant?fork=${id}`} replace />;
  }
  return <Navigate to="/admin" replace />;
}

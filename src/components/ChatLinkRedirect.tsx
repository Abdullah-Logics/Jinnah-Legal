import { Navigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function ChatLinkRedirect() {
  const { userId } = useParams<{ userId: string }>();
  const { isAuthenticated, currentUser } = useStore();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(`/chat/${userId}`)}`} replace />;
  }

  if (currentUser.role === 'lawyer') {
    return <Navigate to={`/lawyer/messages?open=${userId}`} replace />;
  }
  if (currentUser.role === 'client') {
    return <Navigate to={`/client/messages?open=${userId}`} replace />;
  }
  return <Navigate to="/admin" replace />;
}

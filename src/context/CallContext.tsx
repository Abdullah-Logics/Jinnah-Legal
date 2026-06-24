import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const API = import.meta.env.DEV ? 'http://localhost:3001' : import.meta.env.VITE_API_URL || '';

type CallType = 'audio' | 'video';
type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

interface CallState {
  status: CallStatus;
  type: CallType;
  peerId: string | null;
  peerName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

interface CallContextValue {
  call: CallState;
  startCall: (peerId: string, peerName: string, type: CallType) => void;
  endCall: () => void;
  acceptCall: () => void;
  rejectCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  isMuted: boolean;
  isSpeakerOn: boolean;
  onlineUsers: Set<string>;
  socketConnected: boolean;
}

const CallContext = createContext<CallContextValue>(null!);

export function CallProvider({ children, userId }: { children: React.ReactNode; userId: string | null }) {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<{ from: string; sdp: any; type: string } | null>(null);

  const [call, setCall] = useState<CallState>({
    status: 'idle', type: 'audio', peerId: null, peerName: '',
    localStream: null, remoteStream: null,
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (!userId || !API) return;
    const socket = io(API, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('register', userId);
    });

    socket.on('disconnect', (reason) => {
      setSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socket.on('user:online', (uid: string) => {
      setOnlineUsers(prev => new Set(prev).add(uid));
    });

    socket.on('user:offline', (uid: string) => {
      setOnlineUsers(prev => { const next = new Set(prev); next.delete(uid); return next; });
    });

    socketRef.current = socket;

    socket.on('call:offer', async ({ from, sdp, type }) => {
      const user = await fetchUser(from);
      setCall(prev => ({
        ...prev, status: 'ringing', type, peerId: from,
        peerName: user?.name || 'Unknown',
      }));
      pendingOfferRef.current = { from, sdp, type };
    });

    socket.on('call:answer', ({ sdp }) => {
      if (pcRef.current) {
        pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      }
      setCall(prev => ({ ...prev, status: 'connected' }));
    });

    socket.on('ice:candidate', ({ candidate }) => {
      if (pcRef.current && candidate) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('call:end', () => {
      cleanupCallRef();
      setCall(prev => ({ ...prev, status: 'ended', peerName: prev.peerName }));
      setTimeout(() => setCall(prev => ({ ...prev, status: 'idle', peerId: null, peerName: '' })), 2000);
    });

    socket.on('call:missed', () => {
      setCall(prev => ({ ...prev, status: 'idle', peerId: null, peerName: '' }));
    });

    return () => { socket.disconnect(); cleanupCallRef(); };
  }, [userId]);

  const cleanupCallRef = () => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }
    setIsMuted(false);
    setIsSpeakerOn(false);
  };

  const fetchUser = async (uid: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API}/api/users/${uid}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) return await res.json();
    } catch { /* ignore */ }
    return null;
  };

  const getToken = () => {
    try {
      const s = localStorage.getItem('jinnah-legal-storage');
      if (s) {
        const parsed = JSON.parse(s);
        return parsed?.state?.token || null;
      }
    } catch { /* ignore */ }
    return null;
  };

  const createPeerConnection = useCallback(async (stream: MediaStream, peerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      setCall(prev => ({ ...prev, remoteStream: event.streams[0] }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice:candidate', { to: peerId, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        cleanupCallRef();
        setCall(prev => ({ ...prev, status: 'ended' }));
        setTimeout(() => setCall(prev => ({ ...prev, status: 'idle', peerId: null, peerName: '' })), 2000);
      }
    };

    return pc;
  }, []);

  const startCall = useCallback(async (peerId: string, peerName: string, type: CallType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true, video: type === 'video',
      });
      localStreamRef.current = stream;
      setCall({ status: 'calling', type, peerId, peerName, localStream: stream, remoteStream: null });

      const pc = await createPeerConnection(stream, peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('call:offer', { to: peerId, sdp: offer, type });
    } catch (err) {
      console.error('Failed to start call:', err);
      setCall(prev => ({ ...prev, status: 'idle' }));
    }
  }, [createPeerConnection]);

  const acceptCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    if (!offer) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true, video: offer.type === 'video',
      });
      localStreamRef.current = stream;
      setCall(prev => ({ ...prev, localStream: stream, status: 'connected' }));

      const pc = await createPeerConnection(stream, offer.from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('call:answer', { to: offer.from, sdp: answer, type: offer.type });
    } catch (err) {
      console.error('Failed to accept call:', err);
      setCall(prev => ({ ...prev, status: 'idle' }));
    }
    pendingOfferRef.current = null;
  }, [createPeerConnection]);

  const rejectCall = useCallback(() => {
    socketRef.current?.emit('call:end', { to: pendingOfferRef.current?.from });
    pendingOfferRef.current = null;
    setCall(prev => ({ ...prev, status: 'idle', peerId: null, peerName: '' }));
  }, []);

  const endCall = useCallback(() => {
    const pid = call.peerId;
    cleanupCallRef();
    setCall(prev => ({ ...prev, status: 'ended' }));
    socketRef.current?.emit('call:end', { to: pid });
    setTimeout(() => setCall(prev => ({ ...prev, status: 'idle', peerId: null, peerName: '' })), 2000);
  }, [call.peerId]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(prev => !prev);
    }
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
  }, []);

  return (
    <CallContext.Provider value={{
      call, startCall, endCall, acceptCall, rejectCall,
      toggleMute, toggleSpeaker, isMuted, isSpeakerOn,
      onlineUsers, socketConnected,
    }}>
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);

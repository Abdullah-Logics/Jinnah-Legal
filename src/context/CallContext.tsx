import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.DEV
  ? 'http://localhost:3001'
  : import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '';
const REST_API = import.meta.env.DEV
  ? 'http://localhost:3001'
  : import.meta.env.VITE_API_URL || '';

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
  toggleCallType: () => void;
  isMuted: boolean;
  isSpeakerOn: boolean;
  onlineUsers: Set<string>;
  socketConnected: boolean;
}

const CallContext = createContext<CallContextValue>(null!);

function createRingtone(): HTMLAudioElement | null {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    const duration = 0.5;
    const pause = 0.3;
    const pattern = [duration, pause, duration, pause, duration, pause * 3];
    let offset = 0;
    const schedule = () => {
      for (let i = 0; i < pattern.length; i++) {
        const isSound = i % 2 === 0;
        gain.gain.setValueAtTime(isSound ? 0.3 : 0, offset);
        offset += pattern[i];
      }
    };
    schedule();
    setInterval(() => {
      if (ctx.state === 'running') {
        offset = ctx.currentTime;
        gain.gain.cancelScheduledValues(ctx.currentTime);
        schedule();
      }
    }, 4000);
    const audio = new Audio();
    audio.autoplay = true;
    audio.loop = true;
    const dst = ctx.createMediaStreamDestination();
    gain.connect(dst);
    audio.srcObject = dst.stream;
    return audio;
  } catch {
    return null;
  }
}

export function CallProvider({ children, userId }: { children: React.ReactNode; userId: string | null }) {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<{ from: string; sdp: any; type: string } | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callStatusRef = useRef<CallStatus>('idle');
  const callTypeRef = useRef<CallType>('audio');

  const [call, setCall] = useState<CallState>({
    status: 'idle', type: 'audio', peerId: null, peerName: '',
    localStream: null, remoteStream: null,
  });
  const [isMuted, setIsMuted] = useState(false);

  // Keep refs in sync for socket event handlers
  useEffect(() => { callStatusRef.current = call.status; }, [call.status]);
  useEffect(() => { callTypeRef.current = call.type; }, [call.type]);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [socketConnected, setSocketConnected] = useState(false);

  const getAudioConstraints = () => ({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  });

  useEffect(() => {
    if (!userId) return;
    const socketUrl = SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
    if (!socketUrl) return;
    const socket = io(socketUrl, {
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
      if (callStatusRef.current === 'connected' && pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socketRef.current?.emit('call:answer', { to: from, sdp: answer, type });
        } catch (err) {
          console.error('Renegotiation failed:', err);
        }
        return;
      }
      const user = await fetchUser(from);
      setCall(prev => ({
        ...prev, status: 'ringing', type, peerId: from,
        peerName: user?.name || 'Unknown',
      }));
      pendingOfferRef.current = { from, sdp, type };
      if (!ringtoneRef.current) {
        ringtoneRef.current = createRingtone();
      }
      if (ringtoneRef.current) {
        ringtoneRef.current.play().catch(() => {});
      }
    });

    socket.on('call:answer', async ({ sdp }) => {
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        }
        stopRingtone();
        setCall(prev => ({ ...prev, status: 'connected' }));
      } catch (err) {
        console.error('call:answer handler error:', err);
      }
    });

    socket.on('ice:candidate', ({ candidate }) => {
      if (pcRef.current && candidate) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('call:end', () => {
      cleanupCallRef();
      stopRingtone();
      setCall(prev => ({ ...prev, status: 'ended', peerName: prev.peerName }));
      setTimeout(() => setCall(prev => ({ ...prev, status: 'idle', peerId: null, peerName: '' })), 2000);
    });

    socket.on('call:missed', () => {
      stopRingtone();
      setCall(prev => ({ ...prev, status: 'idle', peerId: null, peerName: '' }));
    });

    return () => { socket.disconnect(); cleanupCallRef(); };
  }, [userId]);

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }
  };

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
    stopRingtone();
  };

  const fetchUser = async (uid: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${REST_API}/api/users/${uid}`, {
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
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.l.google.com:5349' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
      iceCandidatePoolSize: 10,
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

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        console.log('ICE gathering complete');
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        cleanupCallRef();
        setCall(prev => ({ ...prev, status: 'ended' }));
        setTimeout(() => setCall(prev => ({ ...prev, status: 'idle', peerId: null, peerName: '' })), 2000);
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        console.log('Negotiation needed');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit('call:offer', { to: peerId, sdp: offer, type: callTypeRef.current });
      } catch (err) {
        console.error('Negotiation failed:', err);
      }
    };

    return pc;
  }, []);

  const startCall = useCallback(async (peerId: string, peerName: string, type: CallType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(),
        video: type === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      localStreamRef.current = stream;
      setCall({ status: 'calling', type, peerId, peerName, localStream: stream, remoteStream: null });

      const pc = await createPeerConnection(stream, peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('call:offer', { to: peerId, sdp: offer, type });
    } catch (err: any) {
      console.error('Call start error:', err.name, err.message, err);
      if (err.name === 'NotAllowedError') {
        console.error('Microphone/camera permission denied');
      } else if (err.name === 'NotFoundError') {
        console.error('No microphone/camera found');
      } else if (err.name === 'NotReadableError') {
        console.error('Device busy (already in use by another tab)');
      }
      setCall(prev => ({ ...prev, status: 'idle' }));
    }
  }, [createPeerConnection]);

  const acceptCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    if (!offer) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(),
        video: offer.type === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      localStreamRef.current = stream;
      stopRingtone();
      setCall(prev => ({ ...prev, localStream: stream, status: 'connected' }));

      const pc = await createPeerConnection(stream, offer.from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('call:answer', { to: offer.from, sdp: answer, type: offer.type });
    } catch (err: any) {
      console.error('Call accept error:', err.name, err.message, err);
      if (err.name === 'NotAllowedError') {
        console.error('Microphone/camera permission denied');
      } else if (err.name === 'NotFoundError') {
        console.error('No microphone/camera found');
      } else if (err.name === 'NotReadableError') {
        console.error('Device busy (already in use by another tab)');
      }
      setCall(prev => ({ ...prev, status: 'idle' }));
    }
    pendingOfferRef.current = null;
  }, [createPeerConnection]);

  const rejectCall = useCallback(() => {
    socketRef.current?.emit('call:end', { to: pendingOfferRef.current?.from });
    pendingOfferRef.current = null;
    stopRingtone();
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

  const toggleCallType = useCallback(async () => {
    if (call.status !== 'connected' || !call.peerId) return;
    const newType: CallType = call.type === 'audio' ? 'video' : 'audio';
    try {
      if (newType === 'video') {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (pcRef.current && localStreamRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          } else {
            pcRef.current.addTrack(videoTrack, localStreamRef.current);
          }
          localStreamRef.current.addTrack(videoTrack);
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socketRef.current?.emit('call:offer', { to: call.peerId, sdp: offer, type: newType });
        }
      } else {
        if (pcRef.current && localStreamRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            pcRef.current.removeTrack(sender);
          }
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.stop();
            localStreamRef.current.removeTrack(videoTrack);
          }
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socketRef.current?.emit('call:offer', { to: call.peerId, sdp: offer, type: newType });
        }
      }
      setCall(prev => ({ ...prev, type: newType }));
    } catch (err) {
      console.error('Failed to toggle call type:', err);
    }
  }, [call.status, call.type, call.peerId]);

  return (
    <CallContext.Provider value={{
      call, startCall, endCall, acceptCall, rejectCall,
      toggleMute, toggleSpeaker, toggleCallType, isMuted, isSpeakerOn,
      onlineUsers, socketConnected,
    }}>
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);

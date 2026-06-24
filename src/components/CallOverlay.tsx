import { useCall } from '../context/CallContext';
import { PhoneOff, Phone, Mic, MicOff, Volume2, VolumeX, WifiOff, Video, VideoOff } from 'lucide-react';

export default function CallOverlay() {
  const { call, endCall, acceptCall, rejectCall, toggleMute, toggleSpeaker, toggleCallType, isMuted, isSpeakerOn, socketConnected } = useCall();

  if (call.status === 'idle') return null;

  const statusText =
    call.status === 'calling' ? 'Calling...' :
    call.status === 'ringing' ? 'Incoming call...' :
    call.status === 'connected' ? (call.type === 'video' ? 'Video call' : 'Audio call') :
    'Call ended';

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {!socketConnected && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-xs text-center py-1.5 flex items-center justify-center gap-1.5 z-30">
          <WifiOff size={14} />
          <span>Disconnected from server</span>
        </div>
      )}

      {/* Remote video fills screen */}
      {call.type === 'video' && call.remoteStream && (
        <video autoPlay playsInline ref={ref => { if (ref && call.remoteStream) ref.srcObject = call.remoteStream; }} className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Audio element */}
      {call.type === 'audio' && call.remoteStream && (
        <audio autoPlay playsInline ref={ref => { if (ref && call.remoteStream) ref.srcObject = call.remoteStream; }} />
      )}

      {/* Audio visualizer */}
      {call.status === 'connected' && call.type === 'audio' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1.5 h-10 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Top gradient overlay with caller info */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent h-32 z-10">
        <div className="pt-14 px-6">
          <h2 className="text-white text-lg font-semibold">{call.peerName}</h2>
          <p className="text-white/60 text-sm mt-0.5">{statusText}</p>
        </div>
      </div>

      {/* Local video PIP */}
      {call.type === 'video' && call.localStream && (
        <div className="absolute top-16 right-4 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl bg-black z-20">
          <video autoPlay playsInline muted ref={ref => { if (ref && call.localStream) ref.srcObject = call.localStream; }} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Bottom gradient overlay with controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-40 z-10">
        <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-6">
          {call.status === 'ringing' && (
            <>
              <button onClick={rejectCall} className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:bg-red-700 transition shadow-lg">
                <PhoneOff size={22} />
              </button>
              <button onClick={acceptCall} className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 active:bg-emerald-700 transition shadow-lg">
                <Phone size={22} />
              </button>
            </>
          )}
          {call.status === 'calling' && (
            <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:bg-red-700 transition shadow-lg">
              <PhoneOff size={22} />
            </button>
          )}
          {call.status === 'connected' && (
            <>
              <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:bg-red-700 transition shadow-lg">
                <PhoneOff size={22} />
              </button>
              <button onClick={toggleSpeaker} className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${isSpeakerOn ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </button>
              <button onClick={toggleCallType} className="w-14 h-14 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition shadow-lg">
                {call.type === 'video' ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            </>
          )}
          {call.status === 'ended' && (
            <button onClick={endCall} className="w-14 h-14 rounded-full bg-slate-600 text-white flex items-center justify-center hover:bg-slate-700 transition shadow-lg">
              <PhoneOff size={22} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';
import { EVENTS } from '../../../shared/events.js';

// Push-to-talk ngắn: ghi âm khi giữ nút, gửi 1 clip qua Socket.IO.
export default function VoiceChat({ roomCode }) {
  const [recording, setRecording] = useState(false);
  const [incoming, setIncoming] = useState('');
  const [error, setError] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    const onClip = ({ audio, mime, playerName }) => {
      if (!audio) return;
      setIncoming(playerName || 'Ai đó');
      const el = new Audio(`data:${mime || 'audio/webm'};base64,${audio}`);
      el.play().catch(() => setError('Trình duyệt chặn phát âm thanh — bấm vào bàn một lần.'));
      el.onended = () => setIncoming('');
    };
    socket.on(EVENTS.VOICE_CLIP, onClip);
    return () => socket.off(EVENTS.VOICE_CLIP, onClip);
  }, []);

  const stop = () => {
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const start = async (event) => {
    event?.preventDefault?.();
    if (recording || !roomCode) return;
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (!blob.size || blob.size > 700_000) return;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = String(reader.result).split(',')[1];
          if (base64) socket.emit(EVENTS.VOICE_CLIP, { roomCode, audio: base64, mime });
        };
        reader.readAsDataURL(blob);
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      recorder.start();
      setRecording(true);
    } catch {
      setError('Không mở được mic. Kiểm tra quyền microphone.');
      setRecording(false);
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={recording ? 'Đang ghi âm, thả để gửi' : 'Giữ để nói'}
        title={recording ? 'Đang nói... thả để gửi' : 'Giữ để nói'}
        className={`landing-icon-btn shrink-0 touch-none ${recording ? 'bg-[var(--oxblood)] text-[var(--paper)]' : ''}`}
      >
        {recording ? '🔴' : '🎙️'}
      </button>
      <span className="min-w-0 truncate text-[10px] font-bold text-[var(--ink-soft)]" aria-live="polite">
        {error || (recording ? 'Đang nói...' : incoming ? `${incoming} đang nói...` : '')}
      </span>
    </div>
  );
}

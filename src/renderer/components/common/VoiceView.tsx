import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { babaChat } from '../../services/modelRouterService';
import type { ChatMessage } from '@shared/types';

export const VoiceView: React.FC = () => {
  const username = useAppStore((s) => s.username);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'voice' | 'face'>('voice');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Enumerate camera devices
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      const cameras = devices.filter(d => d.kind === 'videoinput');
      setCameraDevices(cameras);
      if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
    }).catch(() => {});
  }, []);

  // Start/stop camera
  const toggleCamera = useCallback(async () => {
    if (cameraActive && streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCameraActive(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access failed:', err);
    }
  }, [cameraActive, selectedCamera]);

  // Speech recognition
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript('');
  }, [isListening]);

  // Send transcript to Baba
  const handleSendToBot = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setResponse('');

    try {
      const messages: ChatMessage[] = [
        { id: '1', role: 'system', content: `You are Baba, an AI assistant for ${username}. Be concise and clear. Respond in short spoken sentences.`, timestamp: Date.now() },
        { id: '2', role: 'user', content: transcript, timestamp: Date.now() },
      ];

      const res = await babaChat(messages, (chunk) => {
        setResponse(prev => prev + chunk);
      });
      if (!response && res) setResponse(res);

      // Auto-speak response
      speakText(res || response);
    } catch {
      setResponse('Unable to connect to AI. Check your model provider.');
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      recognitionRef.current?.stop();
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          {mode === 'face' ? '🎥 Face-to-Face Mode' : '🎙️ Voice Mode'}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${mode === 'voice' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('voice')}
          >🎙️ Voice</button>
          <button
            className={`btn btn-sm ${mode === 'face' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('face')}
          >🎥 Face</button>
        </div>
      </div>

      {/* Camera View (Face mode) */}
      {mode === 'face' && (
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'relative', background: '#000', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                <div style={{ fontSize: 14 }}>Camera off. Click Start Camera to begin.</div>
              </div>
            )}

            {/* Camera overlay controls */}
            {cameraActive && (
              <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 12 }}>
                  🔴 LIVE — {selectedCamera ? cameraDevices.find(d => d.deviceId === selectedCamera)?.label || 'Default Camera' : 'Default'}
                </span>
                <span style={{ fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 12 }}>
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-card)' }}>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="input"
              style={{ flex: 1, fontSize: 12 }}
            >
              {cameraDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 8)}`}</option>
              ))}
              <option value="network">📱 Phone as Webcam (DroidCam / IP)</option>
            </select>
            <button className="btn btn-sm btn-primary" onClick={toggleCamera}>
              {cameraActive ? '⏹ Stop Camera' : '▶ Start Camera'}
            </button>
          </div>
        </div>
      )}

      {/* Voice Controls */}
      <div className="card" style={{ marginBottom: 20, padding: 24, textAlign: 'center' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
            background: isListening ? 'rgba(239, 68, 68, 0.15)' : isSpeaking ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-tertiary)',
            border: isListening ? '2px solid var(--accent-red)' : isSpeaking ? '2px solid var(--accent-green)' : '2px solid var(--border-primary)',
            animation: isListening ? 'pulse 1.5s infinite' : isSpeaking ? 'pulse 2s infinite' : 'none',
            transition: 'all 0.3s ease',
          }}>
            {isListening ? '🎤' : isSpeaking ? '🔊' : '🎙️'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {isListening ? 'Listening...' : isSpeaking ? 'Baba is speaking...' : 'Ready for voice input'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {isListening ? 'Speak now — click Stop when finished' : 'Click Start to begin speaking'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`}
            onClick={toggleListening}
          >
            {isListening ? '⏹ Stop Listening' : '🎙️ Start Listening'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleSendToBot}
            disabled={!transcript.trim() || loading}
          >
            {loading ? '⟳ Thinking...' : '➤ Send to Baba'}
          </button>
          {isSpeaking && (
            <button className="btn btn-ghost" onClick={stopSpeaking}>🔇 Stop Speaking</button>
          )}
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-accent)', textTransform: 'uppercase', marginBottom: 8 }}>
            Your Speech
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>{transcript}</div>
        </div>
      )}

      {/* AI Response */}
      {response && (
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', marginBottom: 8 }}>
            Baba Response
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {response}
            {loading && <span style={{ color: 'var(--accent-blue)', animation: 'pulse 1s infinite' }}>▊</span>}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-secondary" onClick={() => speakText(response)}>🔊 Speak Again</button>
            <button className="btn btn-sm btn-secondary" onClick={() => { navigator.clipboard.writeText(response); }}>📋 Copy</button>
          </div>
        </div>
      )}
    </div>
  );
};

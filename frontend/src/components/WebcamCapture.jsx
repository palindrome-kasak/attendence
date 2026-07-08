import { useEffect, useRef, useState } from 'react';

const FRAME_GAP_MS = 350;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function captureFrame(video, canvas, ctx) {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
}

function frameToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}

export default function WebcamCapture({
  onCapture,
  onCancel,
  active,
  multiFrameCount = 1,
  captureLabel = 'Capture',
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!active) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setError('');
      setCapturing(false);
      setStatus('');
      return undefined;
    }

    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setError('');
      } catch (err) {
        setError('Camera access denied. Please allow camera permissions.');
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [active]);

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      setError('Camera is still starting. Please wait a second and try again.');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setCapturing(true);
    setError('');

    try {
      const frames = Math.max(1, multiFrameCount);

      if (frames > 1) {
        setStatus(`Capturing ${frames} live frames...`);
      }

      const blobs = [];
      for (let index = 0; index < frames; index += 1) {
        if (index > 0) {
          setStatus(`Hold still... frame ${index + 1} of ${frames}`);
          await sleep(FRAME_GAP_MS);
        }
        captureFrame(video, canvas, ctx);
        const blob = await frameToBlob(canvas);
        if (blob) blobs.push(blob);
      }

      if (blobs.length === 0) {
        setError('Could not capture image from camera.');
        return;
      }

      onCapture(blobs.length === 1 ? blobs[0] : blobs);
    } finally {
      setCapturing(false);
      setStatus('');
    }
  }

  if (!active) return null;

  return (
    <div className="card mx-auto max-w-lg text-center">
      <h3 className="mb-4 text-lg font-semibold">Camera</h3>
      {multiFrameCount > 1 && (
        <p className="mb-3 text-sm text-slate-500">
          Look at the camera and blink naturally. We capture {multiFrameCount}{' '}
          live frames to verify a real person.
        </p>
      )}
      {error && <p className="mb-4 text-red-600">{error}</p>}
      {status && !error && <p className="mb-4 text-sm text-brand-600">{status}</p>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="mx-auto mb-4 w-full rounded-lg bg-black"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex justify-center gap-3">
        <button className="btn-primary" onClick={capture} disabled={capturing}>
          {capturing ? 'Capturing...' : captureLabel}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={capturing}>
          Cancel
        </button>
      </div>
    </div>
  );
}

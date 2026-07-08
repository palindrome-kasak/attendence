import { useEffect, useRef, useState } from 'react';

const MOTION_DELAY_MS = 450;
const MIN_MOTION_SCORE = 2.5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function captureFrame(video, canvas, ctx) {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function frameMotionScore(frameA, frameB) {
  const pixels = frameA.data.length / 4;
  let totalDiff = 0;

  for (let i = 0; i < frameA.data.length; i += 4) {
    totalDiff += Math.abs(frameA.data[i] - frameB.data[i]);
    totalDiff += Math.abs(frameA.data[i + 1] - frameB.data[i + 1]);
    totalDiff += Math.abs(frameA.data[i + 2] - frameB.data[i + 2]);
  }

  return totalDiff / (pixels * 3);
}

export default function WebcamCapture({
  onCapture,
  onCancel,
  active,
  requireMotionCheck = false,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!active) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setError('');
      setCapturing(false);
      return undefined;
    }

    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
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

  function frameToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setCapturing(true);
    setError('');

    try {
      if (requireMotionCheck) {
        const frame1 = captureFrame(video, canvas, ctx);
        await sleep(MOTION_DELAY_MS);
        const frame2 = captureFrame(video, canvas, ctx);
        const motionScore = frameMotionScore(frame1, frame2);

        if (motionScore < MIN_MOTION_SCORE) {
          setError(
            'Live face not detected. Do not use a photo or phone screen — look directly at the camera.'
          );
          return;
        }
      } else {
        captureFrame(video, canvas, ctx);
      }

      const blob = await frameToBlob(canvas);
      if (blob) onCapture(blob);
    } finally {
      setCapturing(false);
    }
  }

  if (!active) return null;

  return (
    <div className="card mx-auto max-w-lg text-center">
      <h3 className="mb-4 text-lg font-semibold">Camera</h3>
      {requireMotionCheck && (
        <p className="mb-3 text-sm text-slate-500">
          Look at the camera naturally. Printed photos and phone screens are not
          allowed.
        </p>
      )}
      {error && <p className="mb-4 text-red-600">{error}</p>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="mx-auto mb-4 w-full rounded-lg bg-black"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex justify-center gap-3">
        <button
          className="btn-primary"
          onClick={capture}
          disabled={capturing}
        >
          {capturing ? 'Checking...' : 'Capture'}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={capturing}>
          Cancel
        </button>
      </div>
    </div>
  );
}

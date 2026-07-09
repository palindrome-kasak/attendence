import { useState } from 'react';
import { api } from '../api/client';
import WebcamCapture from '../components/WebcamCapture';
import { warmupAiService } from '../utils/warmupAi';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LiveScan() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [warmingAi, setWarmingAi] = useState(false);

  async function startAttendance() {
    setError('');
    setResult(null);
    setWarmingAi(true);
    try {
      await warmupAiService();
      setCameraOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setWarmingAi(false);
    }
  }

  async function handleCapture(capture) {
    setCameraOpen(false);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api.scanAttendance(capture);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="mb-2 text-2xl font-bold">Live Scan</h2>
      <p className="mb-8 text-slate-500">
        Start the camera, look at it naturally, and capture attendance. Printed
        photos and phone screens are blocked.
      </p>

      {!cameraOpen && !loading && !result && (
        <div className="card text-center">
          <p className="mb-6 text-slate-600">Today&apos;s Attendance</p>
          <button
            className="btn-primary px-8 py-3 text-lg"
            disabled={warmingAi}
            onClick={startAttendance}
          >
            {warmingAi ? 'Starting AI service...' : 'Start Attendance'}
          </button>
          {warmingAi && (
            <p className="mt-4 text-sm text-slate-500">
              Render free tier can take up to 60 seconds to wake the AI service.
            </p>
          )}
        </div>
      )}

      {cameraOpen && (
        <WebcamCapture
          active={cameraOpen}
          multiFrameCount={3}
          captureLabel="Capture Attendance"
          onCapture={handleCapture}
          onCancel={() => setCameraOpen(false)}
        />
      )}

      {loading && (
        <div className="card text-center">
          <p className="text-slate-600">
            Verifying live face and matching identity...
          </p>
        </div>
      )}

      {error && (
        <div className="card text-center">
          <p className="mb-4 text-4xl">❌</p>
          <p className="text-lg font-semibold text-red-600">{error}</p>
          <button
            className="btn-primary mt-6"
            onClick={() => {
              setError('');
              setCameraOpen(true);
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {result && (
        <div className="card text-center">
          {result.matched ? (
            <>
              <p className="mb-2 text-4xl">✅</p>
              <p className="text-sm text-slate-500">
                {result.alreadyMarked ? 'Already marked' : 'Welcome'}
              </p>
              <p className="mt-2 text-2xl font-bold">{result.employee?.name}</p>
              <p className="text-slate-500">{result.employee?.employeeId}</p>
              {result.attendance?.checkIn && (
                <p className="mt-4 text-lg font-medium text-green-600">
                  {result.alreadyMarked ? 'Checked in at' : 'Attendance Marked'}{' '}
                  {formatTime(result.attendance.checkIn)}
                </p>
              )}
              {result.confidence != null && (
                <p
                  className={`mt-2 text-sm ${
                    result.confidence >= 75
                      ? 'text-slate-500'
                      : 'font-medium text-amber-600'
                  }`}
                >
                  Confidence {result.confidence}%
                  {result.confidence < 75 ? ' — low match' : ''}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mb-2 text-4xl">❌</p>
              <p className="text-lg font-semibold">Unknown Person</p>
            </>
          )}
          <button
            className="btn-primary mt-6"
            onClick={() => {
              setResult(null);
              setCameraOpen(true);
            }}
          >
            Scan Next
          </button>
        </div>
      )}
    </div>
  );
}

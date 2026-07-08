import { useState } from 'react';
import { api } from '../api/client';
import WebcamCapture from '../components/WebcamCapture';

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

  async function handleCapture(blob) {
    setCameraOpen(false);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api.scanAttendance(blob);
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
        Start the camera, capture a photo, and mark attendance — like a fingerprint
        scanner.
      </p>

      {!cameraOpen && !loading && !result && (
        <div className="card text-center">
          <p className="mb-6 text-slate-600">Today&apos;s Attendance</p>
          <button
            className="btn-primary px-8 py-3 text-lg"
            onClick={() => {
              setError('');
              setResult(null);
              setCameraOpen(true);
            }}
          >
            Start Attendance
          </button>
        </div>
      )}

      {cameraOpen && (
        <WebcamCapture
          active={cameraOpen}
          onCapture={handleCapture}
          onCancel={() => setCameraOpen(false)}
        />
      )}

      {loading && (
        <div className="card text-center">
          <p className="text-slate-600">Recognizing face...</p>
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
              {result.confidence && (
                <p className="mt-2 text-sm text-slate-500">
                  Confidence {result.confidence}%
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

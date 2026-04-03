import { useRef, useState, useCallback, useEffect } from 'react';

export default function CameraCapture({ onCapture, onClear }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setError('No se pudo acceder a la cámara. Verifique los permisos.');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Capturar frame actual
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setPhoto(dataUrl);
    onCapture(dataUrl);
    stopCamera();
  };

  const retry = () => {
    setPhoto(null);
    onClear();
    startCamera();
  };

  return (
    <div className="mp-camera-capture" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      {!stream && !photo && (
        <button 
          type="button"
          onClick={startCamera}
          className="mp-camera-btn"
          style={{
            padding: '12px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '20px auto'
          }}
        >
          📷 Abrir Cámara (Selfie)
        </button>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: '14px' }}>{error}</p>}

      {stream && !photo && (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '3px solid #3b82f6' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} 
          />
          <button 
            type="button"
            onClick={capturePhoto}
            style={{
              position: 'absolute',
              bottom: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#fff',
              border: '4px solid #3b82f6',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
            aria-label="Capturar"
          />
        </div>
      )}

      {photo && (
        <div style={{ position: 'relative' }}>
          <img 
            src={photo} 
            alt="Selfie de validación" 
            style={{ width: '100%', borderRadius: '12px', display: 'block', transform: 'scaleX(-1)', border: '3px solid #16a34a' }} 
          />
          <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#16a34a', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            ✔️ Capturado
          </div>
          <button 
            type="button"
            onClick={retry}
            style={{ margin: '10px auto', background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Tomar otra foto
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

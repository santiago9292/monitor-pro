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
    
    if (!video || !canvas || video.videoWidth === 0) {
      console.error('Error: El video no está listo para captura');
      setError('Cámara no lista. Espere un segundo y reintente.');
      return;
    }

    const ctx = canvas.getContext('2d');
    
    // Capturar frame actual con Mirroring (para que coincida con la vista previa)
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Validación mínima de base64 (debe tener longitud suficiente)
    if (dataUrl.length < 1000) {
      setError('Error al capturar la imagen. Intente de nuevo.');
      return;
    }

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
            justifyContent: 'center',
            gap: '8px',
            margin: '20px auto',
            width: '100%'
          }}
        >
          📷 Abrir Cámara (Selfie)
        </button>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: '13px', background: '#fee2e2', padding: '8px', borderRadius: '6px', marginBottom: '10px' }}>{error}</p>}

      {stream && !photo && (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '3px solid #3b82f6', background: '#000' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            onLoadedMetadata={() => setError(null)}
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
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fff',
              border: '5px solid #3b82f6',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Capturar"
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #3b82f6' }}></div>
          </button>
        </div>
      )}

      {photo && (
        <div style={{ position: 'relative' }}>
          <img 
            src={photo} 
            alt="Selfie de validación" 
            onError={() => setError('Error al cargar la imagen capturada. Reintente.')}
            style={{ width: '100%', borderRadius: '12px', display: 'block', border: '3px solid #16a34a' }} 
          />
          <div style={{ 
            position: 'absolute', 
            top: '12px', 
            right: '12px', 
            background: '#16a34a', 
            color: '#fff', 
            padding: '6px 12px', 
            borderRadius: '6px', 
            fontSize: '12px', 
            fontWeight: 'bold',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
          }}>
            ✔️ Capturado
          </div>
          <button 
            type="button"
            onClick={retry}
            style={{ 
              margin: '12px auto', 
              background: '#f1f5f9', 
              border: '1px solid #cbd5e1', 
              padding: '6px 15px',
              borderRadius: '6px',
              color: '#475569', 
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            🔄 Tomar otra foto
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

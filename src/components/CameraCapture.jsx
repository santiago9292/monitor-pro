import { useRef, useState, useCallback, useEffect } from 'react';

export default function CameraCapture({ onCapture, onClear }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);

  const startCamera = async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      setStream(s);
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setError('No se pudo acceder a la cámara. Verifique los permisos.');
    }
  };

  // Asignación robusta del stream al ref del video
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      // Forzar play por si acaso
      videoRef.current.play().catch(e => console.warn('Error en video play:', e));
    }
  }, [stream]);

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
    
    // Si aún no tiene dimensiones, intentamos esperar un momento o lanzamos error descriptivo
    if (!video || !canvas || video.videoWidth === 0) {
      console.error('Video sin dimensiones aún:', video?.videoWidth);
      setError('Inicializando cámara... Espere un momento y vuelva a capturar.');
      return;
    }

    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    if (dataUrl.length < 1000) {
      setError('Error en la calidad de la imagen. Reintente.');
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
            width: '100%',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
          }}
        >
          📷 Abrir Cámara (Selfie)
        </button>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: '13px', background: '#fee2e2', padding: '10px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #ef4444' }}>{error}</p>}

      {stream && !photo && (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '3px solid #3b82f6', background: '#000', minHeight: '200px' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted // 👈 CRUCIAL: Necesario para autoplay en móviles
            onCanPlay={() => setError(null)}
            style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} 
          />
          <button 
            type="button"
            onClick={capturePhoto}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: '#fff',
              border: '6px solid #3b82f6',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Capturar"
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #3b82f6' }}></div>
          </button>
        </div>
      )}

      {photo && (
        <div style={{ position: 'relative' }}>
          <img 
            src={photo} 
            alt="Selfie de validación" 
            onError={() => setError('Error al cargar la imagen. Intente otra vez.')}
            style={{ width: '100%', borderRadius: '12px', display: 'block', border: '4px solid #16a34a', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
          />
          <div style={{ 
            position: 'absolute', 
            top: '15px', 
            right: '15px', 
            background: '#16a34a', 
            color: '#fff', 
            padding: '6px 14px', 
            borderRadius: '6px', 
            fontSize: '12px', 
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            ✔️ CAPTURADO
          </div>
          <button 
            type="button"
            onClick={retry}
            style={{ 
              marginTop: '15px', 
              background: '#fff', 
              border: '1px solid #cbd5e1', 
              padding: '8px 20px',
              borderRadius: '8px',
              color: '#64748b', 
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              margin: '15px auto'
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

import React, { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

const CameraModal = ({ isOpen, onClose, onCapturePhoto }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [currentFacingMode, setCurrentFacingMode] = useState('environment'); // 'environment' or 'user'
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Stop active camera stream tracks
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start camera stream
  const startCamera = async (facingMode = 'environment') => {
    stopStream();
    setCameraError(null);
    setIsInitializing(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or connection (requires HTTPS or localhost).');
      setIsInitializing(false);
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Video play warning:', playErr);
        });
      }

      // Check available cameras
      try {
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevs);
      } catch (dErr) {
        // ignore device enum error
      }
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings, or upload an image file instead.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device was found on your device. Please use the document/image upload option.');
      } else {
        setCameraError(`Unable to start camera: ${err.message || 'Unknown error'}. Please use standard image upload.`);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedDataUrl(null);
      setCameraError(null);
      startCamera(currentFacingMode);
    } else {
      stopStream();
      setCapturedDataUrl(null);
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  const handleFlipCamera = () => {
    const nextMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    setCurrentFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedDataUrl(dataUrl);
    stopStream();
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    startCamera(currentFacingMode);
  };

  const handleUsePhoto = async () => {
    if (!capturedDataUrl) return;

    // Convert dataURL to File object
    try {
      const res = await fetch(capturedDataUrl);
      const blob = await res.blob();
      const fileName = `camera-photo-${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      onCapturePhoto({
        file,
        previewUrl: capturedDataUrl,
        fileName,
        fileType: 'image/jpeg',
        fileSize: blob.size,
      });

      onClose();
    } catch (e) {
      console.error('Error creating photo file:', e);
      setCameraError('Failed to process captured image.');
    }
  };

  const handleCancel = () => {
    stopStream();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Take Photo for Consultation" maxWidth="600px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {cameraError ? (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#fef2f2',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              color: '#991b1b',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontWeight: 600, margin: '0 0 0.4rem 0' }}>Camera Unavailable</p>
              <p style={{ margin: 0 }}>{cameraError}</p>
            </div>
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '360px',
              backgroundColor: '#0f172a',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Live Video Preview */}
            {!capturedDataUrl && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: isInitializing ? 'none' : 'block',
                }}
              />
            )}

            {/* Captured Photo Preview */}
            {capturedDataUrl && (
              <img
                src={capturedDataUrl}
                alt="Captured document"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            )}

            {/* Initializing Spinner */}
            {isInitializing && !capturedDataUrl && (
              <div style={{ color: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ width: '28px', height: '28px' }} />
                <span style={{ fontSize: '0.85rem' }}>Accessing camera...</span>
              </div>
            )}

            {/* Camera switch toggle button on top right */}
            {!capturedDataUrl && !cameraError && devices.length > 1 && (
              <button
                type="button"
                onClick={handleFlipCamera}
                title="Switch camera"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <RefreshCw size={18} />
              </button>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>

          {capturedDataUrl ? (
            <>
              <Button variant="secondary" onClick={handleRetake} icon={RefreshCw}>
                Retake
              </Button>
              <Button variant="accent" onClick={handleUsePhoto} icon={Check}>
                Use Photo
              </Button>
            </>
          ) : !cameraError ? (
            <Button
              variant="accent"
              onClick={handleCapture}
              disabled={isInitializing}
              icon={Camera}
            >
              Capture Photo
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

export default CameraModal;

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera, CameraOff, AlertTriangle } from 'lucide-react';

interface CameraViewProps {
  isActive: boolean;
  onCameraError: (err: string) => void;
}

export interface CameraViewHandle {
  captureFrame: () => string | null;
}

const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(({ isActive, onCameraError }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return null;
      
      const canvas = document.createElement('canvas');
      // Scale down slightly for faster upload/processing without losing much context
      const scale = 0.5;
      canvas.width = videoRef.current.videoWidth * scale;
      canvas.height = videoRef.current.videoHeight * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        // Returns base64 string without the prefix
        return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      }
      return null;
    }
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Prefer back camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setHasPermission(false);
        onCameraError("Camera permission denied or camera not found.");
      }
    };

    if (isActive) {
      startCamera();
    } else {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, onCameraError]);

  if (!isActive) {
    return (
      <div className="w-full h-64 bg-gray-900 rounded-xl flex flex-col items-center justify-center text-gray-500 border-2 border-gray-800">
        <CameraOff size={48} className="mb-4" />
        <p className="text-lg font-medium">Camera is Paused</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="w-full h-64 bg-red-900/20 rounded-xl flex flex-col items-center justify-center text-red-400 border-2 border-red-800">
        <AlertTriangle size={48} className="mb-4" />
        <p className="text-lg font-bold">Camera Access Denied</p>
        <p className="text-sm mt-2">Please enable permissions in settings.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 md:h-96 bg-black rounded-xl overflow-hidden border-2 border-yellow-500/50 shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {/* Visual Overlay for center targeting */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 border-2 border-yellow-400/50 rounded-full"></div>
        <div className="w-1 h-1 bg-yellow-400 rounded-full absolute"></div>
      </div>
    </div>
  );
});

CameraView.displayName = 'CameraView';
export default CameraView;
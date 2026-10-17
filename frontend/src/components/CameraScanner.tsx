import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { FiCamera, FiVideoOff, FiAlertCircle } from "react-icons/fi";
import { playScanBeep } from "../utils/audio";
import "./CameraScanner.css";

interface CameraScannerProps {
  onScanSuccess: (barcode: string) => void;
  onClose?: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanSuccess,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [lastScanned, setLastScanned] = useState<string>("");

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;

    let isMounted = true;

    const startScanner = async () => {
      try {
        setErrorMessage("");
        setHasPermission(null);

        const videoInputDevices =
          await BrowserMultiFormatReader.listVideoInputDevices();

        if (videoInputDevices.length === 0) {
          throw new Error("No camera video input device found on this device.");
        }

        // Prefer rear / environment camera on mobile phones
        const rearCamera = videoInputDevices.find(
          (device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("rear") ||
            device.label.toLowerCase().includes("environment")
        );

        const selectedDeviceId = rearCamera
          ? rearCamera.deviceId
          : videoInputDevices[0].deviceId;

        if (!videoRef.current || !isMounted) return;

        const controls = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result && isMounted) {
              const text = result.getText();
              setLastScanned(text);
              playScanBeep();
              onScanSuccess(text);
            }
            if (error && !(error.name === "NotFoundException")) {
              // Ignore standard frame-not-found exceptions
            }
          }
        );

        controlsRef.current = controls;
        if (isMounted) {
          setHasPermission(true);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setHasPermission(false);
          if (err instanceof Error) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage("Camera access permission denied or unavailable.");
          }
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [onScanSuccess]);

  const handleStopCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
    }
    if (onClose) onClose();
  };

  return (
    <div className="camera-scanner-wrapper">
      <div className="camera-header-row">
        <div className="camera-title-badge">
          <FiCamera className="camera-icon-badge" />
          <span>Live Barcode Camera Scanner</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="stop-camera-btn"
            onClick={handleStopCamera}
          >
            <FiVideoOff /> Switch to Manual
          </button>
        )}
      </div>

      <div className="video-viewport">
        <video ref={videoRef} className="scanner-video" muted playsInline />

        {/* Viewfinder Target Frame */}
        <div className="scanner-overlay">
          <div className="scan-target-frame">
            <div className="corner top-left" />
            <div className="corner top-right" />
            <div className="corner bottom-left" />
            <div className="corner bottom-right" />
            <div className="laser-line" />
          </div>
          <p className="scan-hint-text">
            Align product barcode inside the green box
          </p>
        </div>

        {hasPermission === false && (
          <div className="camera-error-backdrop">
            <FiAlertCircle className="camera-error-icon" />
            <p className="camera-error-title">Camera Unavailable</p>
            <p className="camera-error-detail">
              {errorMessage || "Please allow camera access or use manual barcode entry below."}
            </p>
            {onClose && (
              <button
                type="button"
                className="error-fallback-btn"
                onClick={onClose}
              >
                Use Manual Barcode Entry
              </button>
            )}
          </div>
        )}
      </div>

      {lastScanned && (
        <div className="last-scanned-bar">
          <span>Decoded Barcode:</span>
          <strong>#{lastScanned}</strong>
        </div>
      )}
    </div>
  );
};

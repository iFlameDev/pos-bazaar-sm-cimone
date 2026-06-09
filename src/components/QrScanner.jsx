import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_REGION_ID = 'pos-qr-scanner-region';

const QrScanner = ({ onScan, onError }) => {
  const scannerRef = useRef(null);
  const startPromiseRef = useRef(null);
  const isStartedRef = useRef(false);

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode(SCANNER_REGION_ID);
    scannerRef.current = html5Qrcode;

    const startScanner = () => {
      startPromiseRef.current = html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          onScan(decodedText);
          console.log("Success scan : " + decodedText)
        },
        (errorMessage) => {
          // Ignore scan-frame errors (these are normal when no QR is in view)
        }
      ).then(() => {
        isStartedRef.current = true;
      }).catch((err) => {
        const errorMsg = err?.message || String(err);
        console.error('QR Scanner failed to start:', errorMsg);
        if (onError) onError(errorMsg);
      });
    };

    startScanner();

    return () => {
      if (startPromiseRef.current) {
        startPromiseRef.current.then(() => {
          if (scannerRef.current && isStartedRef.current) {
            scannerRef.current
              .stop()
              .then(() => {
                isStartedRef.current = false;
                try {
                  scannerRef.current.clear();
                } catch (_) {}
              })
              .catch((err) => {
                console.warn('QR Scanner stop error:', err);
              });
          }
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/80 shadow-xl">
      <div
        id={SCANNER_REGION_ID}
        className="qr-scanner-container"
        style={{ width: '100%', minHeight: '280px' }}
      />
      <style>{`
        .qr-scanner-container video {
          border-radius: 0.75rem;
          object-fit: cover;
        }
        .qr-scanner-container #qr-shaded-region {
          border-color: rgba(139, 92, 246, 0.5) !important;
        }
        #${SCANNER_REGION_ID} img[alt="Info icon"] {
          display: none;
        }
        #${SCANNER_REGION_ID} > div:last-child {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default QrScanner;

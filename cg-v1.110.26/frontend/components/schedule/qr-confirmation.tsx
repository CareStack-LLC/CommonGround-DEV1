'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, Camera, CheckCircle, XCircle, Loader2, Copy, Check, Keyboard, AlertTriangle } from 'lucide-react';
import { exchangesAPI, CustodyExchangeInstance, QRTokenResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';

interface QRConfirmationProps {
  instance: CustodyExchangeInstance;
  onConfirmComplete?: (instance: CustodyExchangeInstance) => void;
  onClose: () => void;
}

type Mode = 'display' | 'scan';
type ScanMode = 'camera' | 'manual';

/**
 * QR Camera Scanner component using html5-qrcode
 * Dynamically imports the library to avoid SSR issues
 */
function QRCameraScanner({
  onScanSuccess,
  onScanError
}: {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}) {
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let html5QrCode: any = null;

    const startScanner = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!mountedRef.current) return;

        html5QrCode = new Html5Qrcode('qr-scanner-container');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 200, height: 200 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            if (mountedRef.current) {
              onScanSuccess(decodedText);
            }
          },
          () => {
            // QR scan failure per frame - ignore (this fires constantly while scanning)
          }
        );

        if (mountedRef.current) {
          setIsStarting(false);
        }
      } catch (err: any) {
        if (!mountedRef.current) return;

        const errorMsg = err?.message || 'Camera access denied';
        setCameraError(
          errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission')
            ? 'Camera permission denied. Please allow camera access or enter the code manually.'
            : `Camera error: ${errorMsg}`
        );
        setIsStarting(false);
        onScanError?.(errorMsg);
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
        html5QrCode.clear();
      }
    };
  }, [onScanSuccess, onScanError]);

  if (cameraError) {
    return (
      <div className="bg-[#FEF7ED] dark:bg-[#1E3A4A]/20 border border-[#FEF7ED] dark:border-[#E09520] rounded-lg p-4 mb-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-[#E09520] mt-0.5 shrink-0" />
          <p className="text-sm text-[#E09520] dark:text-[#F5A623]">{cameraError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="relative rounded-lg overflow-hidden bg-black">
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-2" />
              <p className="text-sm text-white/80">Starting camera...</p>
            </div>
          </div>
        )}
        <div id="qr-scanner-container" ref={containerRef} className="w-full" />
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Point your camera at the QR code on the other parent&apos;s device
      </p>
    </div>
  );
}

export default function QRConfirmation({
  instance,
  onConfirmComplete,
  onClose,
}: QRConfirmationProps) {
  const [mode, setMode] = useState<Mode>('display');
  const [qrToken, setQrToken] = useState<QRTokenResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanToken, setScanToken] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('camera');

  useEffect(() => {
    loadQRToken();
  }, [instance.id]);

  const loadQRToken = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await exchangesAPI.getQRToken(instance.id);
      setQrToken(token);
    } catch (err: any) {
      setError(err.message || 'QR token not available');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmQR = useCallback(async (token?: string) => {
    const tokenToUse = token || scanToken.trim();
    if (!tokenToUse) {
      setError('Please enter the QR code token');
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      const result = await exchangesAPI.confirmQR(instance.id, tokenToUse);
      setConfirmSuccess(true);
      onConfirmComplete?.(result);
    } catch (err: any) {
      setError(err.message || 'Invalid confirmation token');
    } finally {
      setIsConfirming(false);
    }
  }, [instance.id, scanToken, onConfirmComplete]);

  const handleScanSuccess = useCallback((decodedText: string) => {
    setScanToken(decodedText);
    // Auto-confirm when QR is scanned
    handleConfirmQR(decodedText);
  }, [handleConfirmQR]);

  const copyToken = async () => {
    if (qrToken) {
      try {
        await navigator.clipboard.writeText(qrToken.token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Success state
  if (confirmSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md bg-background">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#E8F4F0] dark:bg-[#1E3A4A]/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-[#2D8A70]" />
              </div>

              <h2 className="text-xl font-bold text-foreground mb-2">Exchange Confirmed!</h2>

              <p className="text-muted-foreground mb-6">
                Both parents have verified the exchange. This confirmation is now recorded.
              </p>

              <Button onClick={onClose} className="w-full">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-background max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-[#2D6A8F]" />
              <h2 className="text-xl font-bold text-foreground">QR Confirmation</h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === 'display' ? 'default' : 'outline'}
              onClick={() => setMode('display')}
              className="flex-1"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Show Code
            </Button>
            <Button
              variant={mode === 'scan' ? 'default' : 'outline'}
              onClick={() => setMode('scan')}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan Code
            </Button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#2D6A8F]" />
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="bg-[#FEE2E2] dark:bg-[#7A2222]/30 border border-[#FCA5A5] dark:border-[#9B2C2C] rounded-lg p-4 mb-6">
              <p className="text-[#9B2C2C] dark:text-[#FCA5A5]">{error}</p>
            </div>
          )}

          {/* Display Mode - Show Real QR Code */}
          {mode === 'display' && qrToken && !isLoading && (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Show this code to the other parent to confirm the exchange.
              </p>

              {/* Real QR Code via qrcode.react */}
              <div className="bg-white p-6 rounded-lg inline-block mb-4 border border-gray-200 shadow-sm">
                <QRCodeSVG
                  value={qrToken.token}
                  size={192}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                Or share this confirmation code:
              </p>

              <div className="flex items-center gap-2 justify-center">
                <code className="px-3 py-2 bg-secondary rounded text-sm font-mono break-all">
                  {qrToken.token.substring(0, 20)}...
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToken}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[#2D8A70]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Scan Mode - Camera or Manual Entry */}
          {mode === 'scan' && !isLoading && (
            <div>
              {/* Scan mode toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setScanMode('camera')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    scanMode === 'camera'
                      ? 'bg-[#E0EFF8] dark:bg-[#1E3A4A]/30 text-[#1E4E6B] dark:text-[#4BA8C8] border border-[#4BA8C8] dark:border-[#1E4E6B]'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  Scan with Camera
                </button>
                <button
                  onClick={() => setScanMode('manual')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    scanMode === 'manual'
                      ? 'bg-[#E0EFF8] dark:bg-[#1E3A4A]/30 text-[#1E4E6B] dark:text-[#4BA8C8] border border-[#4BA8C8] dark:border-[#1E4E6B]'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Keyboard className="h-4 w-4" />
                  Enter Manually
                </button>
              </div>

              {/* Camera Scanner */}
              {scanMode === 'camera' && (
                <QRCameraScanner
                  onScanSuccess={handleScanSuccess}
                  onScanError={() => setScanMode('manual')}
                />
              )}

              {/* Manual Entry */}
              {scanMode === 'manual' && (
                <div>
                  <p className="text-muted-foreground mb-4">
                    Enter the confirmation code shown on the other parent&apos;s device.
                  </p>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Confirmation Code
                    </label>
                    <input
                      type="text"
                      value={scanToken}
                      onChange={(e) => setScanToken(e.target.value)}
                      placeholder="Paste or type the code..."
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground font-mono"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={() => handleConfirmQR()}
                disabled={isConfirming || (!scanToken.trim() && scanMode === 'manual')}
                className="w-full bg-[#2D6A8F] hover:bg-[#1E4E6B]"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Exchange
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              QR confirmation provides mutual verification that both parents were present at the exchange.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

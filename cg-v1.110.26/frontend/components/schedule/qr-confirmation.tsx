'use client';

import { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, CheckCircle, XCircle, Loader2, Copy, Check } from 'lucide-react';
import { exchangesAPI, CustodyExchangeInstance, QRTokenResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QRConfirmationProps {
  instance: CustodyExchangeInstance;
  onConfirmComplete?: (instance: CustodyExchangeInstance) => void;
  onClose: () => void;
}

type Mode = 'display' | 'scan';

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

  const handleConfirmQR = async () => {
    if (!scanToken.trim()) {
      setError('Please enter the QR code token');
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      const result = await exchangesAPI.confirmQR(instance.id, scanToken.trim());
      setConfirmSuccess(true);
      onConfirmComplete?.(result);
    } catch (err: any) {
      setError(err.message || 'Invalid confirmation token');
    } finally {
      setIsConfirming(false);
    }
  };

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
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
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
      <Card className="w-full max-w-md bg-background">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-purple-600" />
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
              Enter Code
            </Button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Display Mode - Show QR Code */}
          {mode === 'display' && qrToken && !isLoading && (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Show this code to the other parent to confirm the exchange.
              </p>

              {/* QR Code Placeholder - would use qrcode.react in production */}
              <div className="bg-white p-6 rounded-lg inline-block mb-4 border-2 border-dashed border-gray-300">
                <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="h-16 w-16 mx-auto text-gray-400 mb-2" />
                    <p className="text-xs text-gray-500 font-mono break-all px-2">
                      {qrToken.token.substring(0, 16)}...
                    </p>
                  </div>
                </div>
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
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Scan Mode - Enter Code */}
          {mode === 'scan' && !isLoading && (
            <div>
              <p className="text-muted-foreground mb-4">
                Enter the confirmation code shown on the other parent's device.
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

              <Button
                onClick={handleConfirmQR}
                disabled={isConfirming || !scanToken.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
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

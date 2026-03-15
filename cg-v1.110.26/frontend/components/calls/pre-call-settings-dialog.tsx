"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SensitivityLevel } from "./aria-sensitivity-slider";
import { Phone, Video } from "lucide-react";

interface PreCallSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartCall: (settings: { callType: "video" | "audio"; ariaSensitivity: SensitivityLevel }) => void;
  recipientName: string;
  defaultCallType?: "video" | "audio";
  isLoading?: boolean;
}

export function PreCallSettingsDialog({
  open,
  onOpenChange,
  onStartCall,
  recipientName,
  defaultCallType = "video",
  isLoading = false,
}: PreCallSettingsDialogProps) {
  const [callType, setCallType] = useState<"video" | "audio">(defaultCallType);

  const handleStartCall = () => {
    onStartCall({ callType, ariaSensitivity: "moderate" as SensitivityLevel });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {callType === "video" ? (
              <Video className="w-5 h-5 text-[#7C3AED]" />
            ) : (
              <Phone className="w-5 h-5 text-[#7C3AED]" />
            )}
            Call Settings
          </DialogTitle>
          <DialogDescription>
            Configure your call with {recipientName} before starting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Call Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Call Type</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={callType === "video" ? "default" : "outline"}
                onClick={() => setCallType("video")}
                className={callType === "video" ? "bg-[#7C3AED] hover:bg-[#6D28D9]" : ""}
              >
                <Video className="w-4 h-4 mr-2" />
                Video
              </Button>
              <Button
                type="button"
                variant={callType === "audio" ? "default" : "outline"}
                onClick={() => setCallType("audio")}
                className={callType === "audio" ? "bg-[#7C3AED] hover:bg-[#6D28D9]" : ""}
              >
                <Phone className="w-4 h-4 mr-2" />
                Audio Only
              </Button>
            </div>
          </div>

          {/* Recording Notice */}
          <div className="bg-muted border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Recording Notice:</span> This call will be recorded
              and transcribed for court documentation purposes. Both participants will be
              notified when the call starts.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleStartCall}
            disabled={isLoading}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">...</span>
                Connecting...
              </>
            ) : (
              <>
                {callType === "video" ? (
                  <Video className="w-4 h-4 mr-2" />
                ) : (
                  <Phone className="w-4 h-4 mr-2" />
                )}
                Start Call
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

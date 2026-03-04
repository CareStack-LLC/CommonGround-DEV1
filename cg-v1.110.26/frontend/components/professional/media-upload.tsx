"use client";

import { useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface MediaUploadProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  aspectRatio?: "square" | "video" | "landscape";
  placeholder?: string;
}

export function MediaUpload({
  label,
  value,
  onChange,
  onUpload,
  aspectRatio = "square",
  placeholder = "Upload Image",
}: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const uploadedUrl = await onUpload(file);
      onChange(uploadedUrl);
    } catch (err) {
      setError("Upload failed. Please try again.");
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "square":
        return "aspect-square";
      case "video":
        return "aspect-video";
      case "landscape":
        return "aspect-[16/10]";
      default:
        return "aspect-square";
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-slate-700 font-semibold">{label}</Label>}

      <div className={`relative ${getAspectRatioClass()} w-full max-w-md rounded-lg border-2 border-dashed border-slate-300 overflow-hidden`}>
        {value ? (
          <>
            <img
              src={value.startsWith("http") ? value : `${process.env.NEXT_PUBLIC_API_URL || ""}${value}`}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="flex flex-col items-center justify-center p-6 text-center">
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mb-3" />
                  <p className="text-sm text-slate-500">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700">{placeholder}</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                </>
              )}
            </div>
          </label>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

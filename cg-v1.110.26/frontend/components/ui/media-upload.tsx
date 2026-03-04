"use client";

import { useState, useRef } from "react";
import { UploadCloud, X, Loader2, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaUploadProps {
    value: string;
    onChange: (url: string) => void;
    onUpload: (file: File) => Promise<string>;
    label?: string;
    className?: string;
    aspectRatio?: "square" | "video" | "wide";
    placeholder?: string;
    mediaType?: "image" | "video";
}

export function MediaUpload({
    value,
    onChange,
    onUpload,
    label,
    className,
    aspectRatio = "square",
    placeholder = "Upload media",
    mediaType = "image"
}: MediaUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const url = await onUpload(file);
            onChange(url);
        } catch (error) {
            console.error("Upload failed:", error);
            // Fallback or toast could go here
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const getAspectClass = () => {
        switch (aspectRatio) {
            case "video": return "aspect-video";
            case "wide": return "aspect-[21/9]";
            case "square": default: return "aspect-square";
        }
    };

    const renderMedia = () => {
        if (!value) return null;

        // Auto-resolve relative URLs
        const src = value.startsWith('http')
            ? value
            : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${value}`;

        if (mediaType === "video" || value.match(/\.(mp4|webm|mov)$/i)) {
            return (
                <video
                    src={src}
                    controls
                    className="object-cover w-full h-full"
                />
            );
        }

        return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
                src={src}
                alt={label || "Uploaded media"}
                className="object-cover w-full h-full"
            />
        );
    };

    return (
        <div className={cn("space-y-2", className)}>
            {label && <span className="text-sm font-semibold text-slate-700">{label}</span>}

            <div className={cn(
                "relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg overflow-hidden transition-all group",
                value ? "border-emerald-200 bg-slate-50" : "border-slate-300 hover:border-emerald-400 bg-slate-50 cursor-pointer",
                getAspectClass()
            )}
                onClick={() => !value && fileInputRef.current?.click()}>
                {value ? (
                    <>
                        {renderMedia()}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                disabled={isUploading}
                                className="w-24 shadow-sm"
                            >
                                Change
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                                disabled={isUploading}
                                className="w-24 shadow-sm"
                            >
                                <X className="w-4 h-4 mr-1" />
                                Remove
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full p-4 text-slate-500 hover:text-emerald-600 transition-colors">
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                <span className="text-xs font-medium text-emerald-600 animate-pulse">Uploading...</span>
                            </div>
                        ) : (
                            <>
                                <UploadCloud className="w-10 h-10 mb-2 opactiy-80" />
                                <span className="text-sm font-medium">{placeholder}</span>
                                <span className="text-xs text-slate-400 mt-1 text-center">
                                    {mediaType === "video" ? "MP4, WebM up to 50MB" : "JPG, PNG up to 10MB"}
                                </span>
                            </>
                        )}
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={mediaType === "video" ? "video/*" : "image/*"}
                    onChange={handleFileChange}
                    disabled={isUploading}
                />
            </div>
        </div>
    );
}

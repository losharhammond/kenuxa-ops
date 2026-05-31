"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, ImageIcon, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  path?: string;
  accept?: string;
  maxSizeMB?: number;
  shape?: "square" | "circle";
  size?: "sm" | "md" | "lg";
  placeholder?: string;
  disabled?: boolean;
}

const SIZE_CLASSES = {
  sm: { container: "w-20 h-20", text: "text-[10px]", icon: 16 },
  md: { container: "w-32 h-32", text: "text-xs",     icon: 20 },
  lg: { container: "w-44 h-44", text: "text-sm",     icon: 28 },
};

export function ImageUpload({
  value,
  onChange,
  bucket = "public",
  path = "uploads",
  accept = "image/jpeg,image/png,image/webp,image/gif",
  maxSizeMB = 5,
  shape = "square",
  size = "md",
  placeholder = "Upload image",
  disabled = false,
}: ImageUploadProps) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);

  const sz = SIZE_CLASSES[size];
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl";

  const upload = useCallback(async (file: File) => {
    setError(null);
    setSuccess(false);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image must be under ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const name = `${path}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(name, file, { upsert: true, contentType: file.type });

      if (uploadError) throw new Error(uploadError.message);

      setProgress(80);

      const { data } = supabase.storage.from(bucket).getPublicUrl(name);
      setProgress(100);
      setSuccess(true);
      onChange(data.publicUrl);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [supabase, bucket, path, maxSizeMB, onChange]);

  const handleFile = (file: File | undefined) => {
    if (file) upload(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) handleFile(e.dataTransfer.files[0]);
  }, [disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative ${sz.container} ${shapeClass} border-2 border-dashed cursor-pointer group transition-all overflow-hidden
          ${dragging ? "border-[#FF6524] bg-[rgba(255,101,36,0.08)]" : "border-white/15 bg-white/3 hover:border-[#FF6524]/50 hover:bg-white/5"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${value ? "border-solid border-white/20" : ""}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        aria-label={placeholder}
      >
        {/* Current image */}
        {value && !uploading && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-cover"
          />
        )}

        {/* Placeholder / drag state */}
        {!value && !uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#64748b] group-hover:text-[#FF8B5E] transition-colors">
            <ImageIcon size={sz.icon} />
            <span className={`${sz.text} text-center px-2 leading-tight`}>{placeholder}</span>
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-[#07080f]/80 flex flex-col items-center justify-center gap-2">
            <Loader2 size={sz.icon} className="animate-spin text-[#FF6524]" />
            <div className="w-3/4 bg-white/10 rounded-full h-1">
              <div
                className="bg-[#FF6524] h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={`${sz.text} text-[#FF8B5E]`}>{progress}%</span>
          </div>
        )}

        {/* Success flash */}
        {success && !uploading && (
          <div className="absolute inset-0 bg-[rgba(52,211,153,0.15)] flex items-center justify-center">
            <CheckCircle2 size={sz.icon} className="text-[#34d399]" />
          </div>
        )}

        {/* Hover overlay with change icon (only when image exists) */}
        {value && !uploading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Upload size={sz.icon - 4} className="text-white" />
          </div>
        )}

        {/* Remove button */}
        {value && !uploading && !disabled && (
          <button
            type="button"
            onClick={remove}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center transition-colors z-10"
            aria-label="Remove image"
          >
            <X size={10} className="text-white" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={disabled || uploading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-[#f87171] max-w-[180px] text-center">
          <AlertTriangle size={11} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Helper */}
      {!error && (
        <p className="text-[10px] text-[#374151] text-center">
          {accept.includes("webp") ? "JPG, PNG, WebP" : "JPG, PNG"} · max {maxSizeMB}MB
        </p>
      )}
    </div>
  );
}

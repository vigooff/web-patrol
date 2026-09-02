'use client';

import { useRef, useState } from 'react';
import { Camera, Upload, X, CheckCircle2 } from 'lucide-react';

interface PhotoCaptureProps {
  onPhotoReady: (url: string) => void;
  onPhotoBase64?: (base64: string) => void;
  label?: string;
}

export function PhotoCapture({ onPhotoReady, onPhotoBase64, label = 'Ambil Foto Bukti' }: PhotoCaptureProps) {
  const inputRef    = useRef<HTMLInputElement>(null);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone,    setIsDone]    = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      // Buat preview lokal
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      // Upload ke server
      const formData = new FormData();
      formData.append('file', file);

      const res  = await fetch('/api/v1/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        onPhotoReady(data.data.url);

        // Kalau komponen parent juga butuh base64 (untuk check-in API)
        if (onPhotoBase64) {
          const reader = new FileReader();
          reader.onload = () => onPhotoBase64(reader.result as string);
          reader.readAsDataURL(file);
        }

        setIsDone(true);
      }

    } catch (err) {
      console.error('Upload foto gagal:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setPreview(null);
    setIsDone(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      {/* Input file tersembunyi — trigger kamera di mobile, file picker di desktop */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment" // kamera belakang di mobile
        onChange={handleFileChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview foto" className="w-full h-48 object-cover" />

          {/* Overlay saat loading */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <p className="text-white text-sm font-bold">Mengunggah...</p>
            </div>
          )}

          {/* Badge sukses */}
          {isDone && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--status-success-bg)' }}>
              <CheckCircle2 size={13} color="var(--status-success-text)" />
              <span className="text-xs font-bold" style={{ color: 'var(--status-success-text)' }}>Foto tersimpan</span>
            </div>
          )}

          {/* Tombol hapus */}
          <button
            onClick={reset}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <X size={14} color="white" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold border-2 border-dashed"
          style={{
            background:   'var(--bg-card-soft)',
            borderColor:  'var(--border-default)',
            color:        'var(--text-secondary)',
          }}
        >
          <Camera size={18} />
          {label}
        </button>
      )}
    </div>
  );
}

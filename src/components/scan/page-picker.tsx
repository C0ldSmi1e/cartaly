"use client";

import { useEffect, useRef, useState } from "react";
import { menuLimits } from "@/src/config/constants";

type StagedPhoto = { file: File; previewUrl: string };

const PagePicker = ({
  submitText,
  onSubmit,
}: {
  submitText: (count: number) => string;
  onSubmit: (files: File[]) => Promise<void>;
}) => {
  const [staged, setStaged] = useState<StagedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      return;
    }
    setError(null);
    setStaged((prev) => {
      const room = menuLimits.maxPhotosPerRequest - prev.length;
      if (room <= 0) {
        setError(`At most ${menuLimits.maxPhotosPerRequest} photos at a time`);
        return prev;
      }
      return [
        ...prev,
        ...images.slice(0, room).map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ];
    });
  };

  const removePhoto = (index: number) =>
    setStaged((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.items ?? [])]
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      addFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(staged.map((photo) => photo.file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div
      className="flex w-full flex-col items-center gap-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        addFiles([...e.dataTransfer.files]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />

      <div className="flex w-full flex-wrap justify-center gap-2">
        {staged.map((photo, index) => (
          <div key={photo.previewUrl} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.previewUrl}
              alt={`page ${index + 1}`}
              className="size-20 rounded-lg border border-line object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              disabled={busy}
              aria-label={`Remove page ${index + 1}`}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-xs text-background"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || staged.length >= menuLimits.maxPhotosPerRequest}
          className="flex size-20 items-center justify-center rounded-lg border-2 border-dashed border-line text-2xl text-muted-fg"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={busy || staged.length === 0}
        className="w-full max-w-xs rounded-full bg-accent px-8 py-4 text-lg font-semibold text-white transition-transform active:scale-95 disabled:opacity-45"
      >
        {busy ? "Reading…" : submitText(staged.length)}
      </button>

      {error && (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-center text-sm">
          {error}
        </p>
      )}
    </div>
  );
};

export { PagePicker };

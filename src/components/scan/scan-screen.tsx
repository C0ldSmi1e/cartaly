"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ParseMenuResult } from "@/src/schemas/menu";
import type { StandardResponse } from "@/src/schemas/standard-response";
import { menuLimits } from "@/src/config/constants";
import { downscalePhoto } from "@/src/lib/image";

type ScanState =
  | { status: "idle" }
  | { status: "parsing"; startedAt: number }
  | { status: "error"; message: string };

const ScanScreen = () => {
  const router = useRouter();
  const [state, setState] = useState<ScanState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }
    setState({ status: "parsing", startedAt: Date.now() });
    try {
      const photo = await downscalePhoto(file, menuLimits.maxImageDim);
      const form = new FormData();
      form.append("photo", photo, "menu.jpg");

      const res = await fetch("/api/parse-menu", { method: "POST", body: form });
      const body = (await res.json()) as StandardResponse<ParseMenuResult>;
      if (!res.ok || body.error !== null || body.data === null) {
        setState({
          status: "error",
          message: body.error ?? "Something went wrong — please try again",
        });
        return;
      }
      router.push(`/m/${body.data.menuId}`);
    } catch {
      setState({
        status: "error",
        message: "Couldn't reach the server — check your connection and retry",
      });
    }
  };

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      void handleFile(file);
    }
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = [...(event.clipboardData?.items ?? [])].find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) {
        void handleFile(file);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      className="flex flex-1 flex-col items-center justify-center px-6 py-16"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
          void handleFile(file);
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />

      <h1 className="text-4xl font-bold tracking-tight">
        Cart<span className="text-accent">aly</span>
      </h1>
      <p className="mt-3 max-w-xs text-center text-muted-fg">
        Point at a menu you can&apos;t read — get one you can order from.
      </p>

      {state.status === "parsing" ? (
        <div className="mt-12 flex flex-col items-center gap-3">
          <div
            className="size-8 animate-spin rounded-full border-2 border-line border-t-accent"
            role="status"
            aria-label="Reading the menu"
          />
          <p className="font-medium">Reading the menu…</p>
        </div>
      ) : (
        <div className="mt-12 flex w-full max-w-xs flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-full bg-accent px-8 py-4 text-lg font-semibold text-white transition-transform active:scale-95"
          >
            Scan a menu
          </button>
          <p className="text-xs text-muted-fg">
            Take a photo, choose from your library, drop, or paste
          </p>
          {state.status === "error" && (
            <p className="rounded-xl bg-accent-soft px-4 py-3 text-center text-sm">
              {state.message}
            </p>
          )}
        </div>
      )}
    </main>
  );
};

export { ScanScreen };

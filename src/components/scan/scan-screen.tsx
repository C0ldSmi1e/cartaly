"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ParseMenuResult } from "@/src/schemas/menu";
import type { StandardResponse } from "@/src/schemas/standard-response";
import { menuLimits } from "@/src/config/constants";
import { buildPhotoForm } from "@/src/lib/image";
import { setScanHandoff } from "@/src/lib/scan-handoff";
import { PhotoPicker } from "@/src/components/scan/photo-picker";
import { ReadingView } from "@/src/components/scan/reading-view";

type Parsing = { count: number; photoUrl: string; stage: number };

const stageText = (parsing: Parsing): string =>
  [
    parsing.count > 1 ? "Uploading photos…" : "Uploading photo…",
    "Reading the menu…",
    "Naming the dishes…",
  ][parsing.stage];

const ScanScreen = () => {
  const router = useRouter();
  const [parsing, setParsing] = useState<Parsing | null>(null);

  const scan = async (files: File[]) => {
    const photoUrl = URL.createObjectURL(files[0]);
    setParsing({ count: files.length, photoUrl, stage: 0 });
    const bump = (stage: number) =>
      setParsing((prev) => (prev ? { ...prev, stage } : prev));
    const timers = [setTimeout(() => bump(1), 900), setTimeout(() => bump(2), 4800)];
    try {
      const res = await fetch("/api/parse-menu", {
        method: "POST",
        body: await buildPhotoForm(files, menuLimits.maxImageDim),
      });
      const body = (await res.json()) as StandardResponse<ParseMenuResult>;
      if (!res.ok || body.error !== null || body.data === null) {
        throw new Error(body.error ?? "Something went wrong — please try again");
      }
      setScanHandoff({ menuId: body.data.menuId, photoUrl });
      router.push(`/m/${body.data.menuId}`);
    } catch (error) {
      URL.revokeObjectURL(photoUrl);
      setParsing(null);
      throw error instanceof Error
        ? error
        : new Error("Couldn't reach the server — check your connection and retry");
    } finally {
      timers.forEach(clearTimeout);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      {parsing !== null ? (
        <ReadingView photoUrl={parsing.photoUrl} text={stageText(parsing)} />
      ) : (
        <>
          <h1 className="text-4xl font-bold tracking-tight">
            Cart<span className="text-brass">aly</span>
          </h1>
          <p className="mt-3 max-w-xs text-center text-muted-fg">
            Point at a menu you can&apos;t read — get one you can order from.
          </p>
          <div className="mt-12 w-full max-w-md">
            <PhotoPicker
              submitText={(count) =>
                count <= 1 ? "Read the menu" : `Read ${count} photos`
              }
              onSubmit={scan}
            />
          </div>
        </>
      )}
    </main>
  );
};

export { ScanScreen };

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ParseMenuResult } from "@/src/schemas/menu";
import type { StandardResponse } from "@/src/schemas/standard-response";
import { menuLimits } from "@/src/config/constants";
import { buildPhotoForm } from "@/src/lib/image";
import { PagePicker } from "@/src/components/scan/page-picker";

const ScanScreen = () => {
  const router = useRouter();
  const [parsing, setParsing] = useState<number | null>(null); // page count

  const scan = async (files: File[]) => {
    setParsing(files.length);
    try {
      const res = await fetch("/api/parse-menu", {
        method: "POST",
        body: await buildPhotoForm(files, menuLimits.maxImageDim),
      });
      const body = (await res.json()) as StandardResponse<ParseMenuResult>;
      if (!res.ok || body.error !== null || body.data === null) {
        throw new Error(body.error ?? "Something went wrong — please try again");
      }
      router.push(`/m/${body.data.menuId}`);
    } catch (error) {
      setParsing(null);
      throw error instanceof Error
        ? error
        : new Error("Couldn't reach the server — check your connection and retry");
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">
        Cart<span className="text-accent">aly</span>
      </h1>
      <p className="mt-3 max-w-xs text-center text-muted-fg">
        Point at a menu you can&apos;t read — get one you can order from.
      </p>

      <div className="mt-12 w-full max-w-md">
        {parsing !== null ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="size-8 animate-spin rounded-full border-2 border-line border-t-accent"
              role="status"
              aria-label="Reading the menu"
            />
            <p className="font-medium">
              Reading {parsing === 1 ? "the menu" : `${parsing} pages`}…
            </p>
          </div>
        ) : (
          <PagePicker
            submitText={(count) =>
              count <= 1 ? "Read the menu" : `Read ${count} pages`
            }
            onSubmit={scan}
          />
        )}
      </div>
    </main>
  );
};

export { ScanScreen };

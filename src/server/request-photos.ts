import "server-only";
import type { NextRequest } from "next/server";
import { menuLimits } from "@/src/config/constants";
import { BadRequestError } from "@/src/server/errors";

// Reads 1..maxPhotosPerRequest "photo" files from a multipart request.
const readPhotos = async (request: NextRequest): Promise<Uint8Array[]> => {
  const form = await request.formData().catch(() => {
    throw new BadRequestError("Expected multipart form data with photo files");
  });

  const files = form.getAll("photo").filter((entry) => entry instanceof File);
  if (files.length === 0) {
    throw new BadRequestError("Missing photo file");
  }
  if (files.length > menuLimits.maxPhotosPerRequest) {
    throw new BadRequestError(
      `At most ${menuLimits.maxPhotosPerRequest} photos per request`,
    );
  }
  for (const file of files) {
    if (file.size === 0) {
      throw new BadRequestError("Empty photo file");
    }
    if (file.size > menuLimits.maxUploadBytes) {
      throw new BadRequestError("A photo is larger than 10 MB — pick smaller ones");
    }
  }

  return Promise.all(
    files.map(async (file) => new Uint8Array(await file.arrayBuffer())),
  );
};

export { readPhotos };

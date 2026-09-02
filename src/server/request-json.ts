import "server-only";
import type { NextRequest } from "next/server";

// Malformed or missing JSON reads as null so routes can zod-validate one value.
const readJson = async (request: NextRequest): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export { readJson };

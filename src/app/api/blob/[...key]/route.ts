import { NextRequest, NextResponse } from "next/server";
import { readBlob } from "@/src/server/blob";
import { errorToResponse } from "@/src/server/create-response";
import { NotFoundError } from "@/src/server/errors";

// Binary file serving — the one route that doesn't return the standard envelope.
const GET = async (
  _request: NextRequest,
  ctx: RouteContext<"/api/blob/[...key]">,
) => {
  try {
    const { key } = await ctx.params;
    const bytes = await readBlob(key.join("/"));
    if (!bytes) {
      throw new NotFoundError("Blob not found");
    }
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": key.at(-1)?.endsWith(".webp")
          ? "image/webp"
          : "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { GET };

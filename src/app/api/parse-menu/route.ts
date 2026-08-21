import { NextRequest, NextResponse } from "next/server";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { createMenu } from "@/src/server/actions/create-menu";
import { readPhotos } from "@/src/server/request-photos";
import { enforceRateLimit, getClientIp } from "@/src/server/rate-limit";
import { rateLimits } from "@/src/config/constants";

const POST = async (request: NextRequest) => {
  try {
    const photos = await readPhotos(request);
    enforceRateLimit({
      scope: "photos",
      ip: getClientIp(request),
      limit: rateLimits.photosPerHour,
      cost: photos.length,
    });
    const result = await createMenu({ photos });
    return NextResponse.json(createSuccessResponse({ data: result }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };

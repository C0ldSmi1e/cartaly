import { NextRequest, NextResponse } from "next/server";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { parseMenu } from "@/src/server/actions/parse-menu";
import { menuLimits } from "@/src/config/constants";
import { BadRequestError } from "@/src/server/errors";

const POST = async (request: NextRequest) => {
  try {
    const form = await request.formData().catch(() => {
      throw new BadRequestError("Expected multipart form data with a photo");
    });

    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      throw new BadRequestError("Missing photo file");
    }
    if (photo.size > menuLimits.maxUploadBytes) {
      throw new BadRequestError("Photo is larger than 10 MB — pick a smaller one");
    }

    const photoBytes = new Uint8Array(await photo.arrayBuffer());
    const result = await parseMenu({ photoBytes });
    return NextResponse.json(createSuccessResponse({ data: result }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };

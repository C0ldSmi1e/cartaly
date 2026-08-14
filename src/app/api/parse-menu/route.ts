import { NextRequest, NextResponse } from "next/server";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { parseMenu } from "@/src/server/actions/parse-menu";
import { enforceRateLimit, getClientIp } from "@/src/server/rate-limit";
import { menuLimits } from "@/src/config/constants";
import { BadRequestError } from "@/src/server/errors";

const LANG_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i;

const POST = async (request: NextRequest) => {
  try {
    enforceRateLimit({ scope: "parse", ip: getClientIp(request), limit: 5 });

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

    const rawLang = form.get("targetLang");
    const targetLang =
      typeof rawLang === "string" && LANG_RE.test(rawLang.trim())
        ? rawLang.trim()
        : "en";

    const photoBytes = new Uint8Array(await photo.arrayBuffer());
    const result = await parseMenu({ photoBytes, targetLang });
    return NextResponse.json(createSuccessResponse({ data: result }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };

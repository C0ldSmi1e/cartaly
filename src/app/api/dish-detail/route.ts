import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { getDishDetail } from "@/src/server/actions/dish-detail";
import { enforceRateLimit, getClientIp } from "@/src/server/rate-limit";
import { rateLimits } from "@/src/config/constants";
import { BadRequestError } from "@/src/server/errors";

const bodySchema = z.object({
  name: z.string().min(1).max(300),
});

const POST = async (request: NextRequest) => {
  try {
    enforceRateLimit({
      scope: "detail",
      ip: getClientIp(request),
      limit: rateLimits.detailsPerHour,
    });
    let rawJson: unknown;
    try {
      rawJson = await request.json();
    } catch {
      rawJson = null;
    }
    const body = bodySchema.safeParse(rawJson);
    if (!body.success) {
      throw new BadRequestError("Expected { name: string }");
    }

    const result = await getDishDetail({ name: body.data.name });
    return NextResponse.json(createSuccessResponse({ data: result }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };

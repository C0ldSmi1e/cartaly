import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { getDishInfo, enrichPending } from "@/src/server/actions/dish-info";
import { enforceRateLimit, getClientIp } from "@/src/server/rate-limit";
import { menuLimits, rateLimits } from "@/src/config/constants";
import { BadRequestError } from "@/src/server/errors";

const bodySchema = z.object({
  names: z.array(z.string().min(1).max(300)).min(1).max(menuLimits.maxDishes),
});

const POST = async (request: NextRequest) => {
  try {
    enforceRateLimit({
      scope: "info",
      ip: getClientIp(request),
      limit: rateLimits.infoPerHour,
    });
    let rawJson: unknown;
    try {
      rawJson = await request.json();
    } catch {
      rawJson = null;
    }
    const body = bodySchema.safeParse(rawJson);
    if (!body.success) {
      throw new BadRequestError("Expected { names: string[] }");
    }

    const result = getDishInfo({ names: body.data.names });
    if (result.pending.length > 0) {
      after(() => enrichPending(result.pending));
    }
    return NextResponse.json(createSuccessResponse({ data: result }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };

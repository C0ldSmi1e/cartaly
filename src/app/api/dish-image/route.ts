import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { getDishImage } from "@/src/server/actions/dish-image";
import { enforceRateLimit, getClientIp } from "@/src/server/rate-limit";
import { BadRequestError } from "@/src/server/errors";

const bodySchema = z.object({
  name: z.string().min(1).max(300),
});

const POST = async (request: NextRequest) => {
  try {
    enforceRateLimit({ scope: "image", ip: getClientIp(request), limit: 80 });

    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      throw new BadRequestError("Expected { name }");
    }

    const result = await getDishImage({ name: body.data.name });
    return NextResponse.json(createSuccessResponse({ data: result }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };

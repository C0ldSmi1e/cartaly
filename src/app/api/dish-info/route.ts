import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { getDishInfo } from "@/src/server/actions/dish-info";
import { menuLimits } from "@/src/config/constants";
import { BadRequestError } from "@/src/server/errors";

const bodySchema = z.object({
  names: z.array(z.string().min(1).max(300)).min(1).max(menuLimits.maxDishes),
});

const POST = async (request: NextRequest) => {
  try {
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      throw new BadRequestError("Expected { names: string[] }");
    }

    const result = await getDishInfo({ names: body.data.names });
    return NextResponse.json(createSuccessResponse({ data: result }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };

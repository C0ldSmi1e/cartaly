import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { getOrder, bumpOrder } from "@/src/server/actions/order";
import { readJson } from "@/src/server/request-json";
import { BadRequestError } from "@/src/server/errors";

const ID_RE = /^[0-9A-Za-z]{8,20}$/;

const bodySchema = z.object({
  name: z.string().min(1).max(300),
  delta: z.union([z.literal(1), z.literal(-1)]),
});

const readId = async (ctx: RouteContext<"/api/menus/[id]/order">) => {
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) {
    throw new BadRequestError("Invalid menu id");
  }
  return id;
};

const GET = async (
  _request: NextRequest,
  ctx: RouteContext<"/api/menus/[id]/order">,
) => {
  try {
    const id = await readId(ctx);
    return NextResponse.json(createSuccessResponse({ data: getOrder(id) }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

const POST = async (
  request: NextRequest,
  ctx: RouteContext<"/api/menus/[id]/order">,
) => {
  try {
    const id = await readId(ctx);
    const body = bodySchema.safeParse(await readJson(request));
    if (!body.success) {
      throw new BadRequestError("Expected { name, delta: 1 | -1 }");
    }
    const result = bumpOrder({ menuId: id, ...body.data });
    return NextResponse.json(createSuccessResponse({ data: result }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { GET, POST };

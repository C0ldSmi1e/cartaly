import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { getOrder, bumpOrder } from "@/src/server/actions/order";
import { BadRequestError } from "@/src/server/errors";
import { OrderDeltaSchema } from "@/src/schemas/menu";

const ID_RE = /^[0-9A-Za-z]{8,20}$/;

const bodySchema = z.object({
  name: z.string().min(1).max(300),
  delta: OrderDeltaSchema,
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
    let rawJson: unknown;
    try {
      rawJson = await request.json();
    } catch {
      rawJson = null;
    }
    const body = bodySchema.safeParse(rawJson);
    if (!body.success) {
      throw new BadRequestError('Expected { name, delta: 1 | -1 | "clear" }');
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

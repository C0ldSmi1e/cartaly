import { NextRequest, NextResponse } from "next/server";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { getMenu } from "@/src/server/actions/get-menu";
import { BadRequestError } from "@/src/server/errors";

const ID_RE = /^[0-9A-Za-z]{8,20}$/;

const GET = async (_request: NextRequest, ctx: RouteContext<"/api/menus/[id]">) => {
  try {
    const { id } = await ctx.params;
    if (!ID_RE.test(id)) {
      throw new BadRequestError("Invalid menu id");
    }
    return NextResponse.json(
      createSuccessResponse({ data: getMenu({ menuId: id }) }),
      {
        status: 200,
      },
    );
  } catch (error) {
    return errorToResponse(error);
  }
};

export { GET };

import { NextRequest, NextResponse } from "next/server";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";
import { addPages } from "@/src/server/actions/add-pages";
import { readPhotos } from "@/src/server/request-photos";
import { BadRequestError } from "@/src/server/errors";

const ID_RE = /^[0-9A-Za-z]{8,20}$/;

const POST = async (
  request: NextRequest,
  ctx: RouteContext<"/api/menus/[id]/pages">,
) => {
  try {
    const { id } = await ctx.params;
    if (!ID_RE.test(id)) {
      throw new BadRequestError("Invalid menu id");
    }
    const photos = await readPhotos(request);
    const result = await addPages({ menuId: id, photos });
    return NextResponse.json(createSuccessResponse({ data: result }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { POST };

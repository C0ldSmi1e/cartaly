import { NextRequest, NextResponse } from "next/server";
import {
  createSuccessResponse,
  errorToResponse,
} from "@/src/server/create-response";

const GET = async (_request: NextRequest) => {
  try {
    return NextResponse.json(createSuccessResponse({ data: "Hello, world!" }), {
      status: 200,
    });
  } catch (error) {
    return errorToResponse(error);
  }
};

export { GET };

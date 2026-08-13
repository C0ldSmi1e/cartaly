import { NextResponse } from "next/server";
import { StandardResponse, Pagination } from "@/src/schemas/standard-response";
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  PaymentRequiredError,
  RateLimitError,
  UpstreamError,
} from "@/src/server/errors";

/**
 * Creates a success response with the provided data
 */
const createSuccessResponse = <T>({
  data,
  pagination,
}: {
  data: T;
  pagination?: Pagination | null;
}): StandardResponse<T> => {
  return {
    data,
    error: null,
    pagination: pagination || null,
  };
};

/**
 * Creates an error response with the provided error code and message
 */
const createErrorResponse = <T>({
  message,
}: {
  message: string;
}): StandardResponse<T> => {
  return {
    data: null,
    error: message,
    pagination: null,
  };
};

/**
 * Maps domain errors (src/server/errors.ts) to HTTP responses. Each route's
 * catch block should defer to this; anything that isn't one of the named
 * domain errors falls through to a generic 500.
 */
const errorToResponse = (error: unknown): NextResponse => {
  if (error instanceof RateLimitError) {
    return NextResponse.json(createErrorResponse({ message: error.message }), {
      status: 429,
      headers: { "Retry-After": String(error.retryAfterSec) },
    });
  }
  if (error instanceof BadRequestError) {
    return NextResponse.json(createErrorResponse({ message: error.message }), {
      status: 400,
    });
  }
  if (error instanceof AuthenticationError) {
    return NextResponse.json(createErrorResponse({ message: error.message }), {
      status: 401,
    });
  }
  if (error instanceof PaymentRequiredError) {
    return NextResponse.json(createErrorResponse({ message: error.message }), {
      status: 402,
    });
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json(createErrorResponse({ message: error.message }), {
      status: 403,
    });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json(createErrorResponse({ message: error.message }), {
      status: 404,
    });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json(createErrorResponse({ message: error.message }), {
      status: 409,
    });
  }
  if (error instanceof UpstreamError) {
    return NextResponse.json(createErrorResponse({ message: error.message }), {
      status: 502,
    });
  }
  return NextResponse.json(
    createErrorResponse({
      message: error instanceof Error ? error.message : "Internal Server Error",
    }),
    { status: 500 },
  );
};

export { createSuccessResponse, createErrorResponse, errorToResponse };

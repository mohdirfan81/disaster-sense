import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Minimal API error contract shared by all routes. */

export type ApiErrorCode =
  | "bad_request"
  | "not_found"
  | "unprocessable"
  | "internal_error";

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  not_found: 404,
  unprocessable: 422,
  internal_error: 500,
};

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
  }
  get status() {
    return STATUS[this.code];
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "unprocessable", message: "Validation failed", details: error.flatten() } },
      { status: 422 },
    );
  }
  console.error("[api] unhandled:", error instanceof Error ? error.message : error);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong." } },
    { status: 500 },
  );
}

/** Wraps a route handler with the shared error contract. */
export function withApi<T extends unknown[]>(
  handler: (...args: T) => Promise<Response> | Response,
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function badRequest(message = "Invalid request") {
  return NextResponse.json({ error: "BAD_REQUEST", message }, { status: 400 });
}
export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: "UNAUTHORIZED", message }, { status: 401 });
}
export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
}
export function notFound(message = "Not Found") {
  return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
}
export function conflict(message = "Resource already exists") {
  return NextResponse.json({ error: "CONFLICT", message }, { status: 409 });
}
export function tooManyRequests(message = "Too many requests") {
  return NextResponse.json({ error: "TOO_MANY_REQUESTS", message }, { status: 429 });
}
export function validationError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid request payload",
        issues: error.issues.map(({ path, message }) => ({ path, message })),
      },
      { status: 400 },
    );
  }
  return badRequest();
}

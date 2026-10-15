import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/dev/config" && process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/dev/config",
};

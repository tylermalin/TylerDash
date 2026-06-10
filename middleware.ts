import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// If DASHBOARD_PASSWORD is set, the whole site requires basic auth
// (user: tyler). If unset, the site stays open but renders only the
// setup card, since NOTION_TOKEN setup happens at the same time.

export function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return NextResponse.next();

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(":");
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);
      if (user === "tyler" && pass === password) return NextResponse.next();
    } catch {
      // fall through to challenge
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="OS"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

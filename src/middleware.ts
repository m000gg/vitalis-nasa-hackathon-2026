import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED_HOSTS = ["localhost:1654", "127.0.0.1:1654", "[::1]:1654"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getAllowedHosts(): Set<string> {
  const extra = (process.env.ALLOWED_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_HOSTS, ...extra]);
}

export function middleware(req: NextRequest) {
  const allowedHosts = getAllowedHosts();
  const hostHeader = (req.headers.get("host") ?? "").toLowerCase();

  // 1. Mitigate DNS rebinding on public Wi-Fi by strictly validating Host header
  if (!hostHeader || !allowedHosts.has(hostHeader)) {
    return NextResponse.json(
      { error: "Blocked by local host policy (possible DNS rebinding or unauthorized Host header)." },
      { status: 403 }
    );
  }

  // 2. Mitigate CSRF / cross-origin API writes from untrusted tabs on shared networks
  if (req.nextUrl.pathname.startsWith("/api/") && MUTATING_METHODS.has(req.method)) {
    const fetchSite = req.headers.get("sec-fetch-site");
    if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
      return NextResponse.json(
        { error: "Blocked cross-site API mutation." },
        { status: 403 }
      );
    }

    const origin = req.headers.get("origin");
    if (origin) {
      try {
        const originHost = new URL(origin).host.toLowerCase();
        if (!allowedHosts.has(originHost)) {
          return NextResponse.json(
            { error: "Blocked untrusted Origin on API mutation." },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json({ error: "Invalid Origin header." }, { status: 403 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

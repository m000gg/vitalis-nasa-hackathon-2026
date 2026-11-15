import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED_HOSTS = ["localhost:1654", "127.0.0.1:1654", "[::1]:1654"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeHost(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function getExplicitAllowedHosts(): string[] {
  return (process.env.ALLOWED_HOSTS ?? "")
    .split(",")
    .map((s) => normalizeHost(s))
    .filter(Boolean);
}

function getAllowedHosts(): Set<string> {
  const explicit = getExplicitAllowedHosts();
  const vercelHosts = [
    normalizeHost(process.env.VERCEL_URL),
    normalizeHost(process.env.VERCEL_BRANCH_URL),
    normalizeHost(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ].filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_HOSTS, ...explicit, ...vercelHosts]);
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

export function middleware(req: NextRequest) {
  const explicitHosts = getExplicitAllowedHosts();
  const allowedHosts = getAllowedHosts();
  const vercelOpenMode = isVercelRuntime() && explicitHosts.length === 0;
  const hostHeader = (req.headers.get("host") ?? "").toLowerCase();

  // 1. Mitigate DNS rebinding locally by strictly validating Host header.
  //    On Vercel (without explicit ALLOWED_HOSTS override), edge routing already enforces project domains.
  if (!hostHeader || (!vercelOpenMode && !allowedHosts.has(hostHeader))) {
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
        const originAllowed = vercelOpenMode
          ? originHost === hostHeader || allowedHosts.has(originHost)
          : allowedHosts.has(originHost);

        if (!originAllowed) {
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

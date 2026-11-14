import { NextRequest, NextResponse } from "next/server";
import {
  RADIATION_METHOD_CATALOG,
  runAllRadiationMethods,
  runRadiationMethod,
} from "@/lib/radiation/method-lab";

export async function GET() {
  return NextResponse.json({
    methods: RADIATION_METHOD_CATALOG,
    counts: {
      total: RADIATION_METHOD_CATALOG.length,
      core: RADIATION_METHOD_CATALOG.filter((method) => method.group === "core").length,
      workflows: RADIATION_METHOD_CATALOG.filter((method) => method.group === "workflow").length,
      implemented: RADIATION_METHOD_CATALOG.filter((method) => method.status === "implemented").length,
      experimental: RADIATION_METHOD_CATALOG.filter((method) => method.status === "experimental").length,
      guarded: RADIATION_METHOD_CATALOG.filter((method) => method.status === "guarded").length,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    if (body.runAll === true) {
      const results = runAllRadiationMethods();
      return NextResponse.json({
        fixture: "radiation-method-lab.v1",
        provenanceKind: "simulated",
        results,
        passed: results.filter((result) => result.status === "PASS").length,
        guarded: results.filter((result) => result.status === "GUARDED").length,
      });
    }

    const methodId = typeof body.methodId === "string" ? body.methodId.trim() : "";
    if (!methodId) {
      return NextResponse.json({ error: "methodId or runAll=true is required." }, { status: 400 });
    }
    return NextResponse.json({
      fixture: "radiation-method-lab.v1",
      provenanceKind: "simulated",
      result: runRadiationMethod(methodId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Radiation method failed.";
    return NextResponse.json({ error: message }, { status: /Unknown|No runner/.test(message) ? 404 : 422 });
  }
}

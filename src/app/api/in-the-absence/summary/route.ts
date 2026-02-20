import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
    const base = process.env.AZURE_FUNCTION_BASE_URL;
    const code = process.env.AZURE_FUNCTION_CODE;

    if (!base || !code) {
        return NextResponse.json(
            { error: "Missing AZURE_FUNCTION_BASE_URL or AZURE_FUNCTION_CODE" },
            { status: 500 }
        );
    }

    // Option 1: use ?code=
    const url = `${base}/api/InAbsenceOfGet?code=${encodeURIComponent(code)}`;
    console.log("[InAbsence summary] →", url);

    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    return new Response(text, {
        status: res.status,
        headers: {
            "Content-Type": "application/json",
            "cache-control": "no-store",
        },
    });
}
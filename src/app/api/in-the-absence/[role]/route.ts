import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ role: string }> }) {
    try {
        const { role } = await params;
        const normalizedRole = (role || "").trim();

        if (!normalizedRole) {
            return NextResponse.json({ error: "Missing role" }, { status: 400 });
        }

        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

        // Option 1: use ?code=
        const url =
            `${baseUrl}/api/InAbsenceOfPut/${encodeURIComponent(normalizedRole)}` +
            `?code=${encodeURIComponent(funcCode)}`;

        const bodyText = await req.text();

        console.log("[InAbsence put] →", url);

        const up = await fetch(url, {
            method: "PUT",
            body: bodyText,
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const text = await up.text();

        return new Response(text, {
            status: up.status,
            headers: {
                "Content-Type": "application/json",
                "cache-control": "no-store",
            },
        });
    } catch (e) {
        return NextResponse.json(
            { error: "Unhandled error", message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
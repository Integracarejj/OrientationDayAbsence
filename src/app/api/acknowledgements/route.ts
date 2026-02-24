import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Helper — consistent with other proxy routes
 */
function getRequiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

/**
 * GET /api/acknowledgements?role=CRD&contentType=dayInLife
 * Proxies to Azure Function: GET /api/Acknowledgements
 */
export async function GET(req: NextRequest) {
    try {
        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcKey = getRequiredEnv("AZURE_FUNCTION_CODE");

        const { searchParams } = new URL(req.url);
        const role = searchParams.get("role");
        const contentType = searchParams.get("contentType");

        if (!role || !contentType) {
            return NextResponse.json(
                { error: "Missing role or contentType" },
                { status: 400 }
            );
        }

        const url =
            `${baseUrl}/api/Acknowledgements` +
            `?role=${encodeURIComponent(role)}` +
            `&contentType=${encodeURIComponent(contentType)}` +
            `&code=${encodeURIComponent(funcKey)}`;

        console.log("[ACK GET] →", url);

        const res = await fetch(url, {
            cache: "no-store",
            headers: {
                "x-functions-key": funcKey, // belt & suspenders
            },
        });

        const text = await res.text();

        if (!res.ok) {
            return NextResponse.json(
                {
                    error: "Azure Function call failed",
                    status: res.status,
                    details: text,
                },
                { status: 500 }
            );
        }

        // Azure Function already returns the exact JSON we want
        return new Response(text, {
            status: res.status,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
        });
    } catch (e) {
        return NextResponse.json(
            {
                error: "Unhandled error",
                message: e instanceof Error ? e.message : String(e),
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/acknowledgements
 * Body:
 * {
 *   roleCode: "CRD",
 *   contentType: "dayInLife",
 *   acknowledgedVersion: 3
 * }
 *
 * Proxies to Azure Function: POST /api/Acknowledgements
 */
export async function POST(req: NextRequest) {
    try {
        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcKey = getRequiredEnv("AZURE_FUNCTION_CODE");

        const body = await req.text(); // pass through exactly

        const url =
            `${baseUrl}/api/Acknowledgements` +
            `?code=${encodeURIComponent(funcKey)}`;

        console.log("[ACK POST] →", url);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-functions-key": funcKey,
            },
            body,
            cache: "no-store",
        });

        const text = await res.text();

        if (!res.ok) {
            return NextResponse.json(
                {
                    error: "Azure Function call failed",
                    status: res.status,
                    details: text,
                },
                { status: 500 }
            );
        }

        return new Response(text, {
            status: res.status,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
        });
    } catch (e) {
        return NextResponse.json(
            {
                error: "Unhandled error",
                message: e instanceof Error ? e.message : String(e),
            },
            { status: 500 }
        );
    }
}

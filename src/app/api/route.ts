import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Base API Route: /api
 *
 * IMPORTANT:
 * - This route has NO dynamic params.
 * - Do NOT put employeeId logic here.
 *
 * Your intended release endpoint belongs at:
 * - /api/orientation-tracker/release/[employeeId]
 */

export async function GET(_req: NextRequest) {
    return NextResponse.json(
        {
            ok: true,
            message:
                "Base API route. Use /api/orientation-tracker/release/[employeeId] for release and /api/orientation-tracker/[employeeId] for tracker read.",
        },
        { status: 200 }
    );
}

export async function POST(_req: NextRequest) {
    // Base /api should not accept POST for employee release; that requires a dynamic route segment.
    return NextResponse.json(
        {
            error: "Invalid route",
            message:
                "POST is not supported on /api. Use POST /api/orientation-tracker/release/[employeeId].",
        },
        { status: 405 }
    );
}
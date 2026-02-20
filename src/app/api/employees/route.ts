import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API Route: Employees List + Create Proxy
 *
 * GET  /api/employees
 *  -> Azure Function: EmployeeProfileGet
 *
 * POST /api/employees
 *  -> Azure Function: EmployeeProfileCreate
 *
 * Notes:
 * - Keeps secrets server-side (AZURE_FUNCTION_BASE_URL, AZURE_FUNCTION_CODE)
 * - IMPORTANT CHANGE:
 *   This route now returns the FULL Azure Function JSON response (not just {id}),
 *   so you can see debug fields like resolvedInternalNames, matchingColumns, etc.
 */

function getRequiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

export async function GET() {
    try {
        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

        const url = `${baseUrl}/api/EmployeeProfileGet?code=${encodeURIComponent(
            funcCode
        )}`;

        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();

        if (!res.ok) {
            return NextResponse.json(
                { error: "Azure Function call failed", status: res.status, details: text },
                { status: 500 }
            );
        }

        const json = JSON.parse(text) as { items?: unknown[] };
        return NextResponse.json({ items: Array.isArray(json.items) ? json.items : [] });
    } catch (e) {
        return NextResponse.json(
            { error: "Unhandled error", message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

        const body = await req.json().catch(() => ({} as any));

        // Required fields
        const title = String(body?.title ?? "").trim();
        const startDate = String(body?.startDate ?? "").trim();

        // Role: accept either roleLookupId or roleCode
        const roleLookupId = body?.roleLookupId ?? null;
        const roleCode = String(body?.roleCode ?? "").trim();

        // Optional fields (pass through)
        const supervisorLookupId = body?.supervisorLookupId ?? null;
        const employeeEmail = String(body?.employeeEmail ?? body?.email ?? "").trim();
        const supervisorName = String(body?.supervisorName ?? "").trim();
        const supervisorEmail = String(body?.supervisorEmail ?? "").trim();

        if (!title) {
            return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
        }
        if (!startDate) {
            return NextResponse.json({ error: "Missing required field: startDate" }, { status: 400 });
        }
        if (
            (roleLookupId === null ||
                roleLookupId === undefined ||
                String(roleLookupId).trim() === "") &&
            !roleCode
        ) {
            return NextResponse.json(
                { error: "Provide roleLookupId (number) OR roleCode (string)" },
                { status: 400 }
            );
        }

        // IMPORTANT: match your Azure Function route
        const url = `${baseUrl}/api/EmployeeProfileCreate?code=${encodeURIComponent(funcCode)}`;

        // Helpful server-side visibility (local terminal / hosting console)
        console.log("[/api/employees POST] ->", url);
        console.log("[/api/employees POST] payload ->", {
            title,
            startDate,
            roleLookupId,
            roleCode,
            employeeEmail,
            supervisorName,
            supervisorEmail,
            supervisorLookupId,
        });

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Some Function Apps accept the key as header as well; harmless if unused:
                "x-functions-key": funcCode,
            },
            cache: "no-store",
            body: JSON.stringify({
                title,
                startDate,
                roleLookupId,
                roleCode,
                employeeEmail,
                supervisorName,
                supervisorEmail,
                supervisorLookupId,
            }),
        });

        const text = await res.text();

        // If Azure errors, preserve details for debugging
        if (!res.ok) {
            return NextResponse.json(
                { error: "Azure Function call failed", status: res.status, details: text },
                { status: 500 }
            );
        }

        // ✅ KEY FIX:
        // Return the FULL JSON the Azure Function returned (id + debug + anything else)
        try {
            const json = text ? (JSON.parse(text) as any) : {};
            return NextResponse.json(json, { status: 200 });
        } catch {
            // If Azure returned non-JSON for some reason, still pass it through
            return new Response(text, {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }
    } catch (e) {
        return NextResponse.json(
            { error: "Unhandled error", message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
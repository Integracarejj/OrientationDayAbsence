import { NextRequest, NextResponse } from "next/server";

// ⭐ Use the working Azure function you tested in portal
const AZURE_SEARCH_URL =
    process.env.DIRECTORY_SEARCH_URL ||
    "https://pyscheduledprocs-cxfheugfhgeddhe2.canadacentral-01.azurewebsites.net/api/DirectoryUserSearch";

const FUNCTION_KEY = process.env.AZURE_FUNCTION_KEY || "";

export async function GET(req: NextRequest) {
    console.log("==================================================");
    console.log("[Directory Search API] Incoming request");

    try {
        const q = req.nextUrl.searchParams.get("q")?.trim() || "";
        console.log("[Directory Search API] UI query:", q);

        if (q.length < 3) {
            console.log("[Directory Search API] Query too short");
            return NextResponse.json([]);
        }

        // ⭐ Azure expects q (NOT name)
        const url =
            `${AZURE_SEARCH_URL}?q=${encodeURIComponent(q)}` +
            (FUNCTION_KEY ? `&code=${FUNCTION_KEY}` : "");

        console.log("[Directory Search API] Calling Azure:", url);

        const res = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json" },
        });

        const text = await res.text();

        console.log("[Directory Search API] Azure status:", res.status);
        console.log("[Directory Search API] Azure raw:", text);

        if (!res.ok) {
            console.error("[Directory Search API] Azure failed");
            return NextResponse.json([]);
        }

        const data = JSON.parse(text);

        console.log(
            "[Directory Search API] Returning count:",
            Array.isArray(data) ? data.length : 0
        );

        return NextResponse.json(Array.isArray(data) ? data : []);
    } catch (err) {
        console.error("[Directory Search API] Route failure:", err);
        return NextResponse.json([]);
    } finally {
        console.log("==================================================");
    }
}

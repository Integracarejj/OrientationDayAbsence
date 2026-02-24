// src/app/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const url = req.nextUrl;

    if (
        url.pathname === "/dashboard" &&
        url.searchParams.get("mode") === "employee"
    ) {
        url.pathname = "/me/dashboard";
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard"],
};

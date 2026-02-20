import { Suspense } from "react";
import OrientationClient from "./orientation-client";

export default function OrientationPage() {
    return (
        <Suspense fallback={<div className="p-6 text-slate-500">Loading orientation…</div>}>
            <OrientationClient />
        </Suspense>
    );
}
import React, { useEffect, useRef, useState } from "react";

export interface DirectoryUser {
    id: string;
    displayName: string;
    mail?: string;
    userPrincipalName?: string; // ✅ allow API to return UPN
    jobTitle?: string;
}

interface Props {
    label?: string;
    showLabel?: boolean;
    value?: DirectoryUser | null;
    onChange: (user: DirectoryUser | null) => void;
    onManagerFound?: (manager: DirectoryUser | null) => void; // ✅ typed
}

function normalizeUser(raw: any): DirectoryUser | null {
    if (!raw) return null;

    const id = String(raw.id || "").trim();
    const displayName = String(raw.displayName || raw.name || "").trim();
    if (!id || !displayName) return null;

    const mail =
        (typeof raw.mail === "string" && raw.mail.trim()) ? raw.mail.trim() :
            (typeof raw.userPrincipalName === "string" && raw.userPrincipalName.trim()) ? raw.userPrincipalName.trim() :
                undefined;

    const jobTitle =
        (typeof raw.jobTitle === "string" && raw.jobTitle.trim()) ? raw.jobTitle.trim() : undefined;

    const userPrincipalName =
        (typeof raw.userPrincipalName === "string" && raw.userPrincipalName.trim())
            ? raw.userPrincipalName.trim()
            : undefined;

    return { id, displayName, mail, userPrincipalName, jobTitle };
}

export const PeoplePicker: React.FC<Props> = ({
    label,
    showLabel = false,
    value,
    onChange,
    onManagerFound,
}) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<DirectoryUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [highlight, setHighlight] = useState(0);

    const cache = useRef<Record<string, DirectoryUser[]>>({});
    const debounce = useRef<any>(null);
    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (query.length < 3) {
            setResults([]);
            setHighlight(0);
            return;
        }

        clearTimeout(debounce.current);

        debounce.current = setTimeout(async () => {
            const q = query.trim();
            if (q.length < 3) {
                setResults([]);
                setHighlight(0);
                return;
            }

            if (cache.current[q]) {
                setResults(cache.current[q]);
                setHighlight(0);
                return;
            }

            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;

            setLoading(true);

            try {
                const res = await fetch(`/api/directory/users/search?q=${encodeURIComponent(q)}`, {
                    signal: controller.signal,
                });
                const data = await res.json();

                const safeRaw = Array.isArray(data) ? data : [];
                const safe = safeRaw.map(normalizeUser).filter(Boolean) as DirectoryUser[];

                cache.current[q] = safe;
                setResults(safe);
                setHighlight(0);
            } catch {
                setResults([]);
                setHighlight(0);
            } finally {
                setLoading(false);
            }
        }, 350);

        return () => {
            clearTimeout(debounce.current);
            controllerRef.current?.abort();
        };
    }, [query]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!results.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, results.length - 1));
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        }

        if (e.key === "Enter") {
            e.preventDefault();
            selectUser(results[highlight]);
        }

        if (e.key === "Escape") {
            setResults([]);
            setHighlight(0);
        }
    };

    const selectUser = async (user: DirectoryUser) => {
        onChange(user);
        setResults([]);
        setQuery("");
        setHighlight(0);

        if (onManagerFound) {
            try {
                const r = await fetch(`/api/directory/users/manager?id=${encodeURIComponent(user.id)}`);
                const mgrRaw = await r.json();
                onManagerFound(normalizeUser(mgrRaw));
            } catch {
                onManagerFound(null);
            }
        }
    };

    const showDropdown = !value && results.length > 0;

    return (
        <div className="relative">
            {showLabel && label && (
                <label className="mb-1 block text-sm font-medium text-gray-900">{label}</label>
            )}

            <input
                value={value ? value.displayName : query}
                onChange={(e) => {
                    // when user starts typing, clear selection & search
                    setQuery(e.target.value);
                    if (value) onChange(null);
                }}
                onKeyDown={onKeyDown}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Search directory..."
                aria-autocomplete="list"
                aria-expanded={showDropdown}
            />

            {loading && <div className="mt-1 text-xs text-gray-500">Searching…</div>}

            {showDropdown && (
                <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {results.map((u, i) => (
                        <li
                            key={u.id}
                            className={`cursor-pointer px-3 py-2 text-gray-900 ${i === highlight ? "bg-gray-100" : "hover:bg-gray-50"
                                }`}
                            onMouseEnter={() => setHighlight(i)}
                            onClick={() => selectUser(u)}
                        >
                            <div className="text-sm font-medium text-gray-900">{u.displayName}</div>
                            {u.jobTitle && <div className="text-xs text-gray-600">{u.jobTitle}</div>}
                            {(u.mail || u.userPrincipalName) && (
                                <div className="text-xs text-gray-500">{u.mail ?? u.userPrincipalName}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
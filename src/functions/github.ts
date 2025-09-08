export const REPOS = [
    "geostyler/geostyler-style",
    "geostyler/geostyler",
    "geostyler/geostyler-sld-parser",
    "geostyler/geostyler-mapbox-parser",
    "geostyler/geostyler-qgis-parser",
    "geostyler/geostyler-openlayers-parser",
    "geostyler/geostyler-lyrx-parser",
    "geostyler/geostyler-geojson-parser",
    "geostyler/geostyler-symcore-parser",
    "geostyler/geostyler-masterportal-parser",
    "geostyler/geostyler-data",
    "geostyler/geostyler-legend",
] as const;

export type Repo = (typeof REPOS)[number];

type Cached<T = unknown> = { etag: string; body: T; timestamp: number };

const LSK = (key: string) => `gh-cache:v2:${key}`;

async function ghFetch<T = unknown>(url: string): Promise<T> {
    const token = localStorage.getItem("GITHUB_TOKEN") || undefined;
    const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const cacheKey = LSK(url);
    let cached: Cached | undefined;
    try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) cached = JSON.parse(raw) as Cached;
    } catch {
        // ignore cache parsing errors
    }

    if (cached?.etag) headers["If-None-Match"] = cached.etag;

    const res = await fetch(url, { headers });
    if (res.status === 304 && cached) {
        return cached.body as T;
    }
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub request failed ${res.status}: ${text}`);
    }
    const etag = res.headers.get("ETag") || undefined;
    const body = (await res.json()) as T;
    if (etag) {
        try {
            localStorage.setItem(cacheKey, JSON.stringify({ etag, body, timestamp: Date.now() } satisfies Cached<T>));
        } catch {
            // ignore quota errors
        }
    }
    return body;
}

export type Tag = { name: string };

export async function getTags(repo: Repo): Promise<string[]> {
    // Use the tags endpoint which returns refs/tags
    // Fallback to releases if needed
    const url = `https://api.github.com/repos/${repo}/tags?per_page=100`;
    const tags = await ghFetch<Array<{ name: string }>>(url);
    // Keep the tag name as-is (e.g., 'v8.0.1') so it can be used as the ref
    return tags.map((t) => t.name);
}

import type { PkgJson, PackageLockJson } from "./compat";
export async function getPackageJson(repo: Repo, ref: string): Promise<PkgJson> {
    // Use raw.githubusercontent.com to avoid double fetch of base64
    // But we also want ETag reuse; use API contents for consistent ETag caching
    const url = `https://api.github.com/repos/${repo}/contents/package.json?ref=${encodeURIComponent(ref)}`;
    const data = await ghFetch<{ content: string; encoding: string }>(url);
    const decoded = atob(data.content.replace(/\n/g, ""));
    return JSON.parse(decoded) as PkgJson;
}

export async function getPackageLockJson(repo: Repo, ref: string): Promise<PackageLockJson | null> {
    try {
        const url = `https://api.github.com/repos/${repo}/contents/package-lock.json?ref=${encodeURIComponent(ref)}`;
        const data = await ghFetch<{ content: string; encoding: string }>(url);
        const decoded = atob(data.content.replace(/\n/g, ""));
        return JSON.parse(decoded) as PackageLockJson;
    } catch {
        // Some repos might not have a lock file in older tags
        return null;
    }
}

export function shortRepo(repo: Repo): string {
    return repo.split("/")[1];
}

export function repoLink(repo: Repo): string {
    return `https://github.com/${repo}`;
}

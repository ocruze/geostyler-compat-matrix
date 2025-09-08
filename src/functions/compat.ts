import semver from "semver";
import type { Repo } from "./github";

export type PkgDeps = Record<string, string>;
export type PkgJson = {
    name?: string;
    version?: string;
    dependencies?: PkgDeps;
    peerDependencies?: PkgDeps;
    devDependencies?: PkgDeps;
};

export type LockDeps = Record<string, { version?: string; resolved?: string; dependencies?: Record<string, string> }>;
export type PackageLockJson = {
    name?: string;
    version?: string;
    packages?: Record<string, { version?: string; dependencies?: Record<string, string> }>;
    dependencies?: LockDeps;
};

export const repoToPkgName = (repo: Repo): string => repo.split("/")[1];

export function getRangeFrom(pkg: PkgJson, dep: string): string | undefined {
    return pkg.dependencies?.[dep] || pkg.peerDependencies?.[dep] || pkg.devDependencies?.[dep];
}

export function latestSatisfying(tags: string[], range: string): string | null {
    // Normalize tags to valid semver; ignore non-semver tags
    const cleaned = tags
        .map((t) => semver.coerce(t))
        .filter((c): c is semver.SemVer => Boolean(c))
        .map((c) => c.version);
    const max = semver.maxSatisfying(cleaned, range, { includePrerelease: true, loose: true });
    return max;
}

export function sortDesc(tags: string[]): string[] {
    const cleaned = tags.map((t) => ({ t, v: semver.coerce(t)?.version })).filter((x): x is { t: string; v: string } => Boolean(x.v));
    cleaned.sort((a, b) => semver.rcompare(a.v, b.v));
    return cleaned.map((x) => x.t);
}

export type CompatResult = {
    targetRepo: Repo;
    version: string | null; // latest compatible version
    method: "selected->target" | "target->selected" | "lockfile" | "none";
    details?: string;
};

export function latestTagPerMajor(tags: string[], limit: number): string[] {
    // Choose the newest tag within each major, then take the top N majors (newest first)
    const perMajor = new Map<number, { v: semver.SemVer; tag: string }>();
    for (const t of tags) {
        const c = semver.coerce(t);
        if (!c) continue;
        const prev = perMajor.get(c.major);
        if (!prev || semver.gt(c, prev.v)) perMajor.set(c.major, { v: c, tag: t });
    }
    const list = Array.from(perMajor.values());
    list.sort((a, b) => semver.rcompare(a.v, b.v));
    return list.slice(0, Math.max(0, limit)).map((x) => x.tag);
}

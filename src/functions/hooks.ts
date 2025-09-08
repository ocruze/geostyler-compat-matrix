import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPackageJson, getPackageLockJson, getTags, REPOS, type Repo } from "./github";
import type { PackageLockJson, PkgJson } from "./compat";
import { getRangeFrom, latestSatisfying, repoToPkgName, sortDesc, latestTagPerMajor } from "./compat";

export const useRepos = () => REPOS;

export function useTags(repo: Repo) {
    return useQuery({
        queryKey: ["tags", repo],
        queryFn: () => getTags(repo),
        staleTime: 1000 * 60 * 60, // 1h
        gcTime: 1000 * 60 * 60 * 24, // 24h
    });
}

export function usePackageJson(repo: Repo, ref: string | undefined) {
    return useQuery<PkgJson>({
        queryKey: ["pkg", repo, ref],
        enabled: !!ref,
        queryFn: () => getPackageJson(repo, ref!),
        staleTime: 1000 * 60 * 60,
    });
}

export function usePackageLock(repo: Repo, ref: string | undefined) {
    return useQuery<PackageLockJson | null>({
        queryKey: ["lock", repo, ref],
        enabled: !!ref,
        queryFn: () => getPackageLockJson(repo, ref!),
        staleTime: 1000 * 60 * 60,
    });
}

export function prefetchForRepo(qc: QueryClient, repo: Repo, tag: string) {
    qc.prefetchQuery({ queryKey: ["pkg", repo, tag], queryFn: () => getPackageJson(repo, tag) });
    qc.prefetchQuery({ queryKey: ["lock", repo, tag], queryFn: () => getPackageLockJson(repo, tag) });
}

export type CompatRow = { targetRepo: Repo; version: string | null; method: string; details?: string };

export function useCompat(selectedRepo: Repo, tag: string | undefined, selectedPkg?: PkgJson, lock?: PackageLockJson | null) {
    const qc = useQueryClient();
    return useQuery<CompatRow[]>({
        queryKey: ["compat", selectedRepo, tag, selectedPkg?.version],
        enabled: Boolean(tag),
        gcTime: 1000 * 60 * 60,
        staleTime: 1000 * 60 * 10,
        queryFn: async () => {
            if (!tag) return [];
            const results: CompatRow[] = [];
            const targetTagsMap = new Map<Repo, string[]>();
            // Preload tags for all repos (6 calls max)
            await Promise.all(
                REPOS.filter((r) => r !== selectedRepo).map(async (r) => {
                    const tags = await qc.ensureQueryData<string[]>({ queryKey: ["tags", r], queryFn: () => getTags(r), staleTime: 1000 * 60 * 60 });
                    targetTagsMap.set(r, tags);
                })
            );

            for (const target of REPOS) {
                if (target === selectedRepo) continue;
                const targetName = repoToPkgName(target);
                // Strategy 1: selected depends on target
                const range = selectedPkg ? getRangeFrom(selectedPkg, targetName) : undefined;
                if (range) {
                    const tTags = targetTagsMap.get(target) ?? [];
                    const latest = latestSatisfying(tTags, range);
                    if (latest) {
                        results.push({ targetRepo: target, version: latest, method: "selected->target", details: range });
                        continue;
                    }
                    // If no tag satisfies the range, fall through to other strategies
                }

                // Strategy 3: check lock file
                const fromLock = lock?.dependencies?.[targetName]?.version || lock?.packages?.[`node_modules/${targetName}`]?.version;
                if (fromLock) {
                    results.push({ targetRepo: target, version: fromLock, method: "lockfile" });
                    continue;
                }

                // Strategy 2: reverse check target depends on selected
                const selectedName = repoToPkgName(selectedRepo);
                const tTags = targetTagsMap.get(target) ?? [];
                const sorted = sortDesc(tTags).slice(0, 30); // cap to first 30 most recent
                let found: string | null = null;
                let detail: string | undefined = undefined;
                for (const t of sorted) {
                    const targetPkg = await qc.ensureQueryData<PkgJson>({
                        queryKey: ["pkg", target, t],
                        queryFn: () => getPackageJson(target, t),
                        staleTime: 1000 * 60 * 60,
                    });
                    const r = getRangeFrom(targetPkg, selectedName);
                    if (r && selectedPkg?.version) {
                        // Check if selected version satisfies target's range
                        // We could use latestSatisfying against a single version
                        if (latestSatisfying([selectedPkg.version], r)) {
                            found = t;
                            detail = r;
                            break;
                        }
                    }
                }
                if (found) {
                    results.push({ targetRepo: target, version: found, method: "target->selected", details: detail });
                } else {
                    results.push({ targetRepo: target, version: null, method: "none" });
                }
            }
            return results;
        },
    });
}

export type MatrixCell = { version: string | null; method: string };
export type MatrixRow = { repo: Repo; versions: Record<string, MatrixCell> };

// Builds a matrix: rows are repos, columns are latest N majors of each repo; cell shows latest compatible version of the row repo vs the column repo@tag
export function useFullMatrix(majorsPerRepo = 1) {
    const qc = useQueryClient();
    return useQuery<MatrixRow[]>({
        queryKey: ["full-matrix", majorsPerRepo, ...REPOS],
        gcTime: 1000 * 60 * 60,
        staleTime: 1000 * 60 * 10,
        queryFn: async () => {
            // Fetch tags for all repos
            const allTags = new Map<Repo, string[]>();
            await Promise.all(
                REPOS.map(async (r) => {
                    const tags = await qc.ensureQueryData<string[]>({ queryKey: ["tags", r], queryFn: () => getTags(r), staleTime: 1000 * 60 * 60 });
                    allTags.set(r, sortDesc(tags));
                })
            );

            // Determine column tags: latest N majors per repo
            const columnTags = new Map<Repo, string[]>(REPOS.map((r) => [r, latestTagPerMajor(allTags.get(r) || [], majorsPerRepo)]) as [Repo, string[]][]);

            // Preload pkg/lock for all column tags
            const colMeta = new Map<string, { repo: Repo; tag: string; pkg: PkgJson; lock: PackageLockJson | null }>();
            await Promise.all(
                REPOS.flatMap((r) =>
                    (columnTags.get(r) || []).map(async (t) => {
                        const pkg = await qc.ensureQueryData<PkgJson>({
                            queryKey: ["pkg", r, t],
                            queryFn: () => getPackageJson(r, t),
                            staleTime: 1000 * 60 * 60,
                        });
                        const lock = await qc.ensureQueryData<PackageLockJson | null>({
                            queryKey: ["lock", r, t],
                            queryFn: () => getPackageLockJson(r, t),
                            staleTime: 1000 * 60 * 60,
                        });
                        colMeta.set(`${r}@${t}`, { repo: r, tag: t, pkg, lock });
                    })
                )
            );

            // For each row repo, compute compatibility against each column tag of every other repo
            const rows: MatrixRow[] = [];
            for (const rowRepo of REPOS) {
                const versions: Record<string, MatrixCell> = {};
                for (const colRepo of REPOS) {
                    for (const t of columnTags.get(colRepo) || []) {
                        if (rowRepo === colRepo) {
                            versions[`${colRepo}@${t}`] = { version: t, method: "same" };
                            continue;
                        }
                        const { pkg: selectedPkg, lock } = colMeta.get(`${colRepo}@${t}`)!;
                        const targetName = repoToPkgName(rowRepo);

                        // Strategy 1: colRepo depends on rowRepo
                        const range = getRangeFrom(selectedPkg, targetName);
                        if (range) {
                            const tTags = allTags.get(rowRepo) ?? [];
                            const latest = latestSatisfying(tTags, range);
                            if (latest) {
                                versions[`${colRepo}@${t}`] = { version: latest, method: "selected->target" };
                                continue;
                            }
                        }

                        // Strategy 3: lockfile from the column (selected) repo
                        const fromLock = lock?.dependencies?.[targetName]?.version || lock?.packages?.[`node_modules/${targetName}`]?.version;
                        if (fromLock) {
                            versions[`${colRepo}@${t}`] = { version: fromLock, method: "lockfile" };
                            continue;
                        }

                        // Strategy 2: reverse — find latest rowRepo that depends on colRepo@t
                        const selectedName = repoToPkgName(colRepo);
                        const rTags = allTags.get(rowRepo) ?? [];
                        let found: string | null = null;
                        for (const tv of rTags.slice(0, 30)) {
                            const targetPkg = await qc.ensureQueryData<PkgJson>({
                                queryKey: ["pkg", rowRepo, tv],
                                queryFn: () => getPackageJson(rowRepo, tv),
                                staleTime: 1000 * 60 * 60,
                            });
                            const r = getRangeFrom(targetPkg, selectedName);
                            if (r) {
                                const ok = latestSatisfying([t.replace(/^v/, "")], r); // coerce tag to version when needed
                                if (ok) {
                                    found = tv;
                                    break;
                                }
                            }
                        }
                        versions[`${colRepo}@${t}`] = found ? { version: found, method: "target->selected" } : { version: null, method: "none" };
                    }
                }
                rows.push({ repo: rowRepo, versions });
            }
            return rows;
        },
    });
}

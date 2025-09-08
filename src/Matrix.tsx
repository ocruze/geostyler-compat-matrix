import { useMemo, useState } from "react";
import { sortDesc } from "./compat";
import { REPOS, type Repo, shortRepo } from "./github";
import { useCompat, usePackageJson, usePackageLock, useTags } from "./hooks";
import TokenManager from "./TokenManager";

function Selector({ value, onChange }: { value: Repo; onChange: (r: Repo) => void }) {
    return (
        <select value={value} onChange={(e) => onChange(e.target.value as Repo)}>
            {REPOS.map((r) => (
                <option key={r} value={r}>
                    {r}
                </option>
            ))}
        </select>
    );
}

function TagPicker({ repo, value, onChange }: { repo: Repo; value?: string; onChange: (tag: string) => void }) {
    const { data: tags, isLoading, error } = useTags(repo);
    const sorted = useMemo(() => (tags ? sortDesc(tags) : []), [tags]);
    if (isLoading) return <span>Loading tags…</span>;
    if (error) return <span>Error loading tags</span>;
    return (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select version…</option>
            {sorted.map((t) => (
                <option key={t} value={t}>
                    {t}
                </option>
            ))}
        </select>
    );
}

export default function Matrix() {
    const [repo, setRepo] = useState<Repo>(REPOS[0]);
    const [tag, setTag] = useState<string | undefined>(undefined);
    const { data: pkg } = usePackageJson(repo, tag);
    const { data: lock } = usePackageLock(repo, tag);
    const { data: results, isFetching } = useCompat(repo, tag, pkg, lock);

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label>Library:</label>
                <Selector value={repo} onChange={(r) => setRepo(r)} />
                <label>Version:</label>
                <TagPicker repo={repo} value={tag} onChange={setTag} />
            </div>
            {tag && results && (
                <div>
                    <h3>
                        Compatibility for {repo}@{tag}
                    </h3>
                    <table style={{ borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Target</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Latest compatible</th>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r) => (
                                <tr key={r.targetRepo}>
                                    <td style={{ padding: 8 }}>{shortRepo(r.targetRepo)}</td>
                                    <td style={{ padding: 8 }}>{r.version ?? "Unknown"}</td>
                                    <td style={{ padding: 8 }}>{r.method}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {isFetching ? <div>Computing…</div> : null}
                </div>
            )}
            <section style={{ marginTop: 12 }}>
                <details>
                    <summary style={{ cursor: "pointer", fontWeight: 600 }}>What do the methods mean?</summary>
                    <ul style={{ marginTop: 8 }}>
                        <li>
                            <code>selected-&gt;target</code>: Use the selected library's package.json to read its semver range for the target; pick the newest
                            target version that satisfies that range.
                        </li>
                        <li>
                            <code>target-&gt;selected</code>: Check the target library's package.json (across recent tags) to find the newest target version
                            whose declared range is satisfied by the selected library's version.
                        </li>
                        <li>
                            <code>lockfile</code>: Read the selected library's package-lock.json for that tag and use the resolved target version from it.
                        </li>
                        <li>
                            <code>none</code>: No compatible version could be determined from the above methods.
                        </li>
                    </ul>
                </details>
            </section>
            <TokenManager />
        </div>
    );
}

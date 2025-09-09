import { useEffect, useMemo, useState } from "react";
import { sortDesc } from "./functions/compat";
import { REPOS, type Repo, repoLink, shortRepo } from "./functions/github";
import { useCompat, usePackageJson, usePackageLock, useTags } from "./functions/hooks";
import { Collapse, Select, Typography } from "antd";

function Selector({ value, onChange }: { value: Repo; onChange: (r: Repo) => void }) {
    return (
        <Select
            value={value}
            onChange={onChange}
            options={REPOS.map((r) => ({
                value: r,
                label: shortRepo(r),
            }))}
            style={{ minWidth: 240 }}
        />
    );
}

function TagPicker({ repo, value, onChange }: { repo: Repo; value?: string; onChange: (tag: string) => void }) {
    const { data: tags, isLoading, error } = useTags(repo);
    const sorted = useMemo(() => (tags ? sortDesc(tags) : []), [tags]);
    if (isLoading) return <span>Loading tags…</span>;
    if (error) return <span>Error loading tags</span>;

    return (
        <Select
            value={value}
            onChange={onChange}
            options={sorted.map((t) => ({
                label: t,
                value: t,
            }))}
        />
    );
}

export default function SingleCompat() {
    const [repo, setRepo] = useState<Repo>(REPOS[0]);
    const [tag, setTag] = useState<string | undefined>(undefined);
    const { data: pkg } = usePackageJson(repo, tag);
    const { data: lock } = usePackageLock(repo, tag);
    const { data: results, isFetching } = useCompat(repo, tag, pkg, lock);

    const { data: tags } = useTags(repo);
    useEffect(() => {
        if (tags) {
            const sorted = sortDesc(tags);
            if (sorted.length > 0) {
                setTag(sorted[0]);
            }
        }
    }, [tags]);

    return (
        <section>
            <Typography.Title level={2}>Single Library Compatibility</Typography.Title>
            <p>Select a library and version</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label>Library:</label>
                <Selector value={repo} onChange={(r) => setRepo(r)} />
                <label>Version:</label>
                <TagPicker repo={repo} value={tag} onChange={setTag} />
            </div>
            {isFetching && <div>Loading</div>}

            {tag && results && (
                <div>
                    <Typography.Title level={3}>
                        Compatibility for {repo}@{tag}
                    </Typography.Title>
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
                                    <td style={{ padding: 8 }}>
                                        <a href={repoLink(r.targetRepo)} target="_blank" rel="noreferrer">
                                            {shortRepo(r.targetRepo)}
                                        </a>
                                    </td>
                                    <td style={{ padding: 8 }}>{r.version ?? "Unknown"}</td>
                                    <td style={{ padding: 8 }}>{r.method}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Collapse
                items={[
                    {
                        key: "methods",
                        label: "What do the methods mean?",
                        children: (
                            <ul style={{ marginTop: 8 }}>
                                <li>
                                    <code>core</code>: Compatibility is determined by intersecting both libraries' declared semver ranges for the core packages{" "}
                                    <code>geostyler-style</code> and <code>geostyler-data</code>. The newest target version whose package.json works with the
                                    same core version(s) is selected.
                                </li>
                                <li>
                                    <code>selected-&gt;target</code>: Use the selected library's package.json to read its semver range for the target; pick the
                                    newest target version that satisfies that range.
                                </li>
                                <li>
                                    <code>target-&gt;selected</code>: Check the target library's package.json (across recent tags) to find the newest target
                                    version whose declared range is satisfied by the selected library's version.
                                </li>
                                <li>
                                    <code>lockfile</code>: Read the selected library's package-lock.json for that tag and use the resolved target version from
                                    it.
                                </li>
                                <li>
                                    <code>none</code>: No compatible version could be determined from the above methods.
                                </li>
                            </ul>
                        ),
                    },
                ]}
            />
        </section>
    );
}

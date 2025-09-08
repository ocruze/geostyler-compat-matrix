import { useState } from "react";
import { REPOS, repoLink, shortRepo } from "./functions/github";
import { useFullMatrix } from "./functions/hooks";

export default function FullMatrix() {
    const [majorsPerRepo, setMajorsPerRepo] = useState(1);
    const { data: fullMatrix, isFetching } = useFullMatrix(majorsPerRepo);

    return (
        <section>
            <h2>Compatibility matrix</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <label>Majors per library:</label>
                <select value={majorsPerRepo} onChange={(e) => setMajorsPerRepo(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                            {n}
                        </option>
                    ))}
                </select>
            </div>
            {isFetching && <div>Loading</div>}

            {fullMatrix && (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", minWidth: 600 }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Library \ Selected@Tag</th>
                                {REPOS.flatMap((r) => (
                                    <th key={r} colSpan={majorsPerRepo} style={{ textAlign: "center", borderBottom: "1px solid #ccc", padding: 8 }}>
                                        <a href={repoLink(r)} target="_blank" rel="noreferrer">
                                            {shortRepo(r)}
                                        </a>
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                <th />
                                {REPOS.flatMap((r) =>
                                    (fullMatrix[0] ? Object.keys(fullMatrix[0].versions) : [])
                                        .filter((key) => key.startsWith(`${r}@`))
                                        .slice(0, majorsPerRepo)
                                        .map((key) => (
                                            <th key={key} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>
                                                {key.split("@")[1]}
                                            </th>
                                        ))
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {fullMatrix.map((row) => (
                                <tr key={row.repo}>
                                    <td style={{ padding: 8, fontWeight: 600 }}>
                                        <a href={repoLink(row.repo)} target="_blank" rel="noreferrer">
                                            {shortRepo(row.repo)}
                                        </a>
                                    </td>
                                    {REPOS.flatMap((r) =>
                                        Object.keys(row.versions)
                                            .filter((key) => key.startsWith(`${r}@`))
                                            .slice(0, majorsPerRepo)
                                            .map((key) => {
                                                const cell = row.versions[key];
                                                return (
                                                    <td key={`${row.repo}-${key}`} style={{ padding: 8 }}>
                                                        {cell.version ?? "—"}
                                                    </td>
                                                );
                                            })
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

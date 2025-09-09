import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Space } from "antd";
import { useState } from "react";

export default function TokenManager() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [token, setToken] = useState(localStorage.getItem("GITHUB_TOKEN") ?? "");
    const [status, setStatus] = useState<string | null>(null);

    const save = () => {
        localStorage.setItem("GITHUB_TOKEN", token.trim());
        qc.invalidateQueries({ queryKey: ["tags"] });
        qc.invalidateQueries({ queryKey: ["pkg"] });
        qc.invalidateQueries({ queryKey: ["lock"] });
        qc.invalidateQueries({ queryKey: ["compat"] });
        qc.invalidateQueries({ queryKey: ["full-matrix"] });
        setStatus("Saved");
        setTimeout(() => setStatus(null), 1500);
    };
    const clear = () => {
        localStorage.removeItem("GITHUB_TOKEN");
        setToken("");
        qc.invalidateQueries({ queryKey: ["tags"] });
        qc.invalidateQueries({ queryKey: ["pkg"] });
        qc.invalidateQueries({ queryKey: ["lock"] });
        qc.invalidateQueries({ queryKey: ["compat"] });
        qc.invalidateQueries({ queryKey: ["full-matrix"] });
        setStatus("Cleared");
        setTimeout(() => setStatus(null), 1500);
    };

    const masked = token ? token.replace(/.(?=.{4})/g, "•") : "";

    return (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #3333", borderRadius: 6 }}>
            <Button onClick={() => setOpen((v) => !v)} style={{ padding: "4px 8px" }}>
                {open ? "Hide GitHub token" : "Set GitHub token"}
            </Button>
            {open ? (
                <>
                    <Space.Compact style={{ width: "100%" }}>
                        <Input
                            type="password"
                            placeholder="ghp_…"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            style={{ minWidth: 280, padding: 6 }}
                            autoComplete="off"
                        />
                        <Button onClick={save} style={{ padding: "6px 10px" }}>
                            Save
                        </Button>
                        <Button onClick={clear} style={{ padding: "6px 10px" }}>
                            Clear
                        </Button>
                    </Space.Compact>

                    <Space.Compact style={{ width: "100%" }}>
                        <span style={{ fontSize: 12, color: "#666" }}>Current: {token ? masked : "(not set)"}</span>
                        {status ? <span style={{ fontSize: 12 }}>{status}</span> : null}
                    </Space.Compact>
                </>
            ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                    {token ? "A token is set (hidden)." : "No token set."} Using a token increases GitHub API limits.
                </div>
            )}
        </div>
    );
}

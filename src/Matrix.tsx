import FullMatrix from "./FullMatrix";
import SingleCompat from "./SingleCompat";
import TokenManager from "./TokenManager";

export default function Matrix() {
    return (
        <div style={{ display: "grid", gap: 12 }}>
            <FullMatrix />
            <SingleCompat />
            <TokenManager />
        </div>
    );
}

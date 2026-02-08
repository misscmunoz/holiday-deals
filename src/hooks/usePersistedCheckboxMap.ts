import React from "react";
export function usePersistedCheckboxMap(key: string) {
    const [map, setMap] = React.useState<Record<string, boolean>>(() => {
        if (typeof window === "undefined") return {};
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : {};
    });

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem(key, JSON.stringify(map));
        }
    }, [map, key]);

    return [map, setMap] as const;
}
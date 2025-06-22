import { cn } from "@/lib/utils";

const CHIP_COLORS: Record<string, string> = {
    failure: "o-red",
    ui: "o-white",
} as const;

export function Chip({
    label,
    type,
}: {
    label: string;
    type: keyof typeof CHIP_COLORS;
}) {
    const suffix = CHIP_COLORS[type];

    return (
        <div
            className={cn(
                "flex-center rounded-md border px-2 py-1",
                `bg-${suffix}/10 border-${suffix}`
            )}
        >
            <p className={cn("text-o-white text-xs font-medium")}>{label}</p>
        </div>
    );
}

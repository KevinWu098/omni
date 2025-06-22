import { cn } from "@/lib/utils";

const CHIP_STYLES = {
    failure: { bg: "bg-o-red/10", border: "border-o-red" },
    success: { bg: "bg-o-green/10", border: "border-o-green" },
    ui: { bg: "bg-o-white/10", border: "border-o-white" },
    branch: { bg: "bg-o-blue/10", border: "border-o-blue" },
} as const;

type ChipType = keyof typeof CHIP_STYLES;

export function Chip({ label, type }: { label: string; type: ChipType }) {
    const styles = CHIP_STYLES[type];

    return (
        <div
            className={cn(
                "flex-center rounded-md border px-2 py-1",
                styles.bg,
                styles.border
            )}
        >
            <p className={cn("text-xs font-medium text-o-white")}>{label}</p>
        </div>
    );
}

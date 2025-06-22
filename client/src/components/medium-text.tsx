import { cn } from "@/lib/utils";

const LABEL_COLORS: Record<string, string> = {
    success: "text-o-green",
    failure: "text-o-red",
    warning: "text-o-primary",
    nit: "text-o-white",
} as const;

export function MediumText({
    label,
    value,
    type,
}: {
    label: string;
    value: string;
    type: keyof typeof LABEL_COLORS;
}) {
    return (
        <div className="flex flex-col font-medium">
            <span className="text-xs">{label}</span>
            <span className={cn("text-2xl", LABEL_COLORS[type])}>{value}</span>
        </div>
    );
}

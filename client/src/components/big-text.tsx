export function BigText({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col font-medium">
            <span className="text-xs">{label}</span>
            <span className="text-3xl">{value}</span>
        </div>
    );
}

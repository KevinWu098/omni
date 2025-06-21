import { cn } from "@/lib/utils";

export type Test = { title: string; steps: number; status: string };

type TestCardProps = Test & {
    handleTestClick: ((test: Test) => void) | null;
};

export function TestCard({
    title,
    steps,
    status,
    handleTestClick,
}: TestCardProps) {
    return (
        <div
            className={cn(
                "border-o-background flex flex-col gap-y-4 border-t-[1px] p-4 last:border-b-[1px]",
                handleTestClick && "hover:bg-o-base-foreground cursor-pointer"
            )}
            onClick={() => handleTestClick?.({ title, steps, status })}
        >
            <span className="text-medium text-base">{title}</span>

            <div className="flex flex-col gap-y-3">
                <div className="flex h-full flex-row items-center text-sm font-medium">
                    <p>Steps</p>
                    <div className="border-o-outline h-full grow border-b-[1px] border-dashed">
                        &nbsp;
                    </div>
                    <p>{steps}</p>
                </div>

                <div className="flex h-full flex-row items-center text-sm font-medium">
                    <p>Status</p>
                    <div className="border-o-outline h-full grow border-b-[1px] border-dashed">
                        &nbsp;
                    </div>
                    {/* TODO: Add status color */}
                    <p className="text-o-green">{status}</p>
                </div>
            </div>
        </div>
    );
}

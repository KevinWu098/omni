import { type Test } from "@/components/builder/content";
import { cn } from "@/lib/utils";

type TestCardProps = Test & {
    handleTestClick: ((test: Test) => void) | null;
};

const STATUS_COLORS: Record<Test["status"], string> = {
    enabled: "text-o-green",
    disabled: "text-o-red",
};

export function TestCard({ handleTestClick, ...test }: TestCardProps) {
    return (
        <div
            className={cn(
                "border-o-background flex flex-col gap-y-4 border-t-[1px] p-4 last:border-b-[1px]",
                handleTestClick && "hover:bg-o-base-foreground cursor-pointer"
            )}
            onClick={() => handleTestClick?.(test)}
        >
            <span className="text-medium text-base">{test.title}</span>

            <div className="flex flex-col gap-y-3">
                <div className="flex h-full flex-row items-center text-sm font-medium">
                    <p>Steps</p>
                    <div className="border-o-muted-dark h-full grow border-b-[1px] border-dashed">
                        &nbsp;
                    </div>
                    <p>{test.steps.length}</p>
                </div>

                <div className="flex h-full flex-row items-center text-sm font-medium">
                    <p>Status</p>
                    <div className="border-o-muted-dark h-full grow border-b-[1px] border-dashed">
                        &nbsp;
                    </div>
                    <p className={STATUS_COLORS[test.status]}>{test.status}</p>
                </div>
            </div>
        </div>
    );
}

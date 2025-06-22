import { cn } from "@/lib/utils";

export function SidebarWrapper({
    title,
    show,
    children,
    width = 480,
}: {
    title: string;
    show: boolean;
    children: React.ReactNode;
    width?: number;
}) {
    return (
        <div
            className={cn(
                "relative h-[calc(100%)] border-l-2 border-o-background",
                !show && "hidden"
            )}
            style={{ width: `${width}px`, minWidth: `${width}px` }}
        >
            <div className="relative flex w-fit flex-col items-center justify-center bg-o-base-background px-4 py-2">
                <span className="text-xs font-medium leading-none text-o-white">
                    {title}
                </span>
                <div className="absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2 bg-o-primary" />
            </div>

            <div className="box-border flex h-[calc(100%-30px)] flex-col border-r-2 border-t-2 border-[#141414] bg-o-base-background text-o-white">
                {children}
            </div>
        </div>
    );
}

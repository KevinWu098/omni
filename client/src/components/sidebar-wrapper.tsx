import { cn } from "@/lib/utils";

export function SidebarWrapper({
    title,
    show,
    children,
}: {
    title: string;
    show: boolean;
    children: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                "border-o-background relative w-[400px] min-w-[400px]",
                !show && "hidden"
            )}
        >
            <div className="bg-o-base-background relative flex w-fit flex-col items-center justify-center px-4 py-2">
                <span className="text-o-white text-xs font-medium leading-none">
                    {title}
                </span>
                <div className="bg-o-primary absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="bg-o-base-background text-o-white box-border flex h-[calc(100%-30px)] flex-col border-r-2 border-t-2 border-[#141414]">
                {children}
            </div>
        </div>
    );
}

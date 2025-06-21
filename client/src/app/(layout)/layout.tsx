export default function Layout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="bg-o-base-background overflow-hidden">
            <div className="bg-o-header w-full p-2">
                <span className="text-o-white flex items-center text-sm font-semibold uppercase leading-none tracking-widest">
                    Omni
                </span>
            </div>
            <div className="h-[calc(100dvh-40px)] w-full">{children}</div>
        </div>
    );
}

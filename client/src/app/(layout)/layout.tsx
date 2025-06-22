export default function Layout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="overflow-hidden bg-o-base-background">
            <div className="h-[calc(100dvh-30px)] w-full">{children}</div>
        </div>
    );
}

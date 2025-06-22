import { Content } from "@/components/content";
import { authOptions } from "@/lib/auth";
import { getPRData } from "@/lib/github";
import { getServerSession } from "next-auth";

interface PageProps {
    searchParams: Promise<{
        repo?: string;
        pr?: string;
    }>;
}

export default async function Page({ searchParams }: PageProps) {
    const params = await searchParams;
    let prData = null;
    if (params.repo && params.pr) {
        try {
            const session = await getServerSession(authOptions);
            if (session?.accessToken) {
                prData = await getPRData(
                    session.accessToken,
                    params.repo,
                    parseInt(params.pr)
                );
            }
        } catch (error) {
            console.error("Failed to fetch PR data:", error);
        }
    }

    return <Content prData={prData} />;
}

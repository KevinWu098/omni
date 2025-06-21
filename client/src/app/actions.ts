"use server";

import { authOptions } from "@/lib/auth";
import { createPR } from "@/lib/github";
import { getServerSession } from "next-auth";

export async function createPullRequest(
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string = "main"
) {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        throw new Error("Not authenticated");
    }

    try {
        const result = await createPR(
            session.accessToken,
            repo,
            title,
            body,
            head,
            base
        );
        return { success: true, data: result };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

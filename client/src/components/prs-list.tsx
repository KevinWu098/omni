"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPRs, GitHubPR } from "@/lib/github";
import { useSession } from "next-auth/react";

interface PRsListProps {
    repo: string;
}

export function PRsList({ repo }: PRsListProps) {
    const { data: session } = useSession();
    const [prs, setPrs] = useState<GitHubPR[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (session?.accessToken && repo) {
            setLoading(true);
            getPRs(session.accessToken, repo)
                .then(setPrs)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [session?.accessToken, repo]);

    const handlePRClick = (pr: GitHubPR) => {
        // Navigate to root page with PR details as search parameters
        router.push(`/?repo=${encodeURIComponent(repo)}&pr=${pr.number}`);
    };

    if (!session) {
        return <p>Please sign in to view PRs</p>;
    }

    if (loading) {
        return <p>Loading PRs...</p>;
    }

    return (
        <div>
            <h3>Pull Requests for {repo}</h3>
            <ul className="space-y-3">
                {prs.map((pr) => (
                    <li
                        key={pr.id}
                        className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-gray-50"
                    >
                        <div onClick={() => handlePRClick(pr)}>
                            <div className="mb-2 flex items-center justify-between">
                                <h4 className="font-medium text-blue-600 hover:text-blue-800">
                                    #{pr.number} {pr.title}
                                </h4>
                                <span
                                    className={`rounded px-2 py-1 text-xs ${
                                        pr.state === "open"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                    }`}
                                >
                                    {pr.state}
                                </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                                <p>Created by: {pr.user.login}</p>
                                <p>
                                    Head: {pr.head.ref} → Base: {pr.base.ref}
                                </p>
                                <p>
                                    Created:{" "}
                                    {new Date(
                                        pr.created_at
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t pt-2">
                            <button
                                onClick={() => handlePRClick(pr)}
                                className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
                            >
                                View Details
                            </button>
                            <a
                                href={pr.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-500 hover:text-gray-700"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Open in GitHub
                            </a>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

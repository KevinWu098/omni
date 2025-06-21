"use client";

import { useEffect, useState } from "react";
import { getPRs, GitHubPR } from "@/lib/github";
import { useSession } from "next-auth/react";

interface PRsListProps {
    repo: string;
}

export function PRsList({ repo }: PRsListProps) {
    const { data: session } = useSession();
    const [prs, setPrs] = useState<GitHubPR[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session?.accessToken && repo) {
            setLoading(true);
            getPRs(session.accessToken, repo)
                .then(setPrs)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [session?.accessToken, repo]);

    if (!session) {
        return <p>Please sign in to view PRs</p>;
    }

    if (loading) {
        return <p>Loading PRs...</p>;
    }

    return (
        <div>
            <h3>Pull Requests for {repo}</h3>
            <ul>
                {prs.map((pr) => (
                    <li key={pr.id}>
                        <a
                            href={pr.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            #{pr.number} {pr.title}
                        </a>
                        <p>State: {pr.state}</p>
                        <p>Created by: {pr.user.login}</p>
                        <p>
                            Head: {pr.head.ref} → Base: {pr.base.ref}
                        </p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

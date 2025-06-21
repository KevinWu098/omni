"use client";

import { useEffect, useState } from "react";
import { getRepos, GitHubRepo } from "@/lib/github";
import { useSession } from "next-auth/react";

export function ReposList() {
    const { data: session } = useSession();
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session?.accessToken) {
            setLoading(true);
            getRepos(session.accessToken)
                .then(setRepos)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [session?.accessToken]);

    if (!session) {
        return <p>Please sign in to view your repositories</p>;
    }

    if (loading) {
        return <p>Loading repositories...</p>;
    }

    return (
        <div>
            <h2>Your Repositories</h2>
            <ul>
                {repos.map((repo) => (
                    <li key={repo.id}>
                        <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {repo.full_name}
                        </a>
                        {repo.description && <p>{repo.description}</p>}
                        <p>Language: {repo.language || "Unknown"}</p>
                        <p>Stars: {repo.stargazers_count}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

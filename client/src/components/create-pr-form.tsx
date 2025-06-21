"use client";

import { useState } from "react";
import { createPullRequest } from "@/app/actions";
import { useSession } from "next-auth/react";

export function CreatePRForm() {
    const { data: session } = useSession();
    const [repo, setRepo] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [head, setHead] = useState("");
    const [base, setBase] = useState("main");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        data?: any;
        error?: string;
    } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const result = await createPullRequest(
                repo,
                title,
                body,
                head,
                base
            );
            setResult(result);
        } catch (error) {
            setResult({ success: false, error: "Failed to create PR" });
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return <p>Please sign in to create PRs</p>;
    }

    return (
        <div>
            <h3>Create Pull Request</h3>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Repository (owner/repo):</label>
                    <input
                        type="text"
                        value={repo}
                        onChange={(e) => setRepo(e.target.value)}
                        placeholder="owner/repo"
                        required
                    />
                </div>
                <div>
                    <label>Title:</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Body:</label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Head branch:</label>
                    <input
                        type="text"
                        value={head}
                        onChange={(e) => setHead(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Base branch:</label>
                    <input
                        type="text"
                        value={base}
                        onChange={(e) => setBase(e.target.value)}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Creating..." : "Create PR"}
                </button>
            </form>

            {result && (
                <div>
                    {result.success ? (
                        <p>PR created successfully!</p>
                    ) : (
                        <p>Error: {result.error}</p>
                    )}
                </div>
            )}
        </div>
    );
}

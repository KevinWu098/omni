"use client";

import { useState } from "react";
import { CreatePRForm } from "@/components/create-pr-form";
import { LoginButton } from "@/components/login-button";
import { PRsList } from "@/components/prs-list";
import { ReposList } from "@/components/repos-list";

export default function GitHubPage() {
    const [selectedRepo, setSelectedRepo] = useState("");

    return (
        <div style={{ padding: "20px" }}>
            <h1>GitHub Integration</h1>

            <LoginButton />

            <hr style={{ margin: "20px 0" }} />

            <ReposList />

            <hr style={{ margin: "20px 0" }} />

            <div>
                <h3>View PRs for Repository</h3>
                <input
                    type="text"
                    placeholder="Enter repo (owner/repo)"
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                />
                {selectedRepo && <PRsList repo={selectedRepo} />}
            </div>

            <hr style={{ margin: "20px 0" }} />

            <CreatePRForm />
        </div>
    );
}

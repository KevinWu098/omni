export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    private: boolean;
    fork: boolean;
    stargazers_count: number;
    language: string | null;
}

export interface GitHubPR {
    id: number;
    number: number;
    title: string;
    state: string;
    html_url: string;
    created_at: string;
    updated_at: string;
    user: {
        login: string;
        avatar_url: string;
    };
    head: {
        ref: string;
    };
    base: {
        ref: string;
    };
}

export async function getRepos(accessToken: string): Promise<GitHubRepo[]> {
    const response = await fetch("https://api.github.com/user/repos", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch repos");
    }

    return response.json();
}

export async function getPRs(
    accessToken: string,
    repo: string
): Promise<GitHubPR[]> {
    const response = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch PRs");
    }

    return response.json();
}

export async function createPR(
    accessToken: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string = "main"
): Promise<any> {
    const response = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            title,
            body,
            head,
            base,
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to create PR");
    }

    return response.json();
}

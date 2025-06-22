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
    body: string | null;
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

export interface GitHubComment {
    id: number;
    user: {
        login: string;
        avatar_url: string;
    };
    created_at: string;
    updated_at: string;
    body: string;
}

export interface GitHubReview {
    id: number;
    user: {
        login: string;
        avatar_url: string;
    };
    state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED";
    body: string | null;
    submitted_at: string;
}

export interface GitHubReviewComment {
    id: number;
    user: {
        login: string;
        avatar_url: string;
    };
    created_at: string;
    updated_at: string;
    body: string;
    path: string;
    line: number | null;
    original_line: number | null;
}

export interface PRData {
    pr: GitHubPR;
    comments: GitHubComment[];
    reviews: GitHubReview[];
    reviewComments: GitHubReviewComment[];
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

export async function getPRDetails(
    accessToken: string,
    repo: string,
    prNumber: number
): Promise<GitHubPR> {
    const response = await fetch(
        `https://api.github.com/repos/${repo}/pulls/${prNumber}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-GitHub-Api-Version": "2022-11-28",
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch PR details");
    }

    return response.json();
}

export async function getPRComments(
    accessToken: string,
    repo: string,
    prNumber: number
): Promise<GitHubComment[]> {
    const response = await fetch(
        `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-GitHub-Api-Version": "2022-11-28",
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch PR comments");
    }

    return response.json();
}

export async function getPRReviews(
    accessToken: string,
    repo: string,
    prNumber: number
): Promise<GitHubReview[]> {
    const response = await fetch(
        `https://api.github.com/repos/${repo}/pulls/${prNumber}/reviews`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-GitHub-Api-Version": "2022-11-28",
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch PR reviews");
    }

    return response.json();
}

export async function getPRReviewComments(
    accessToken: string,
    repo: string,
    prNumber: number
): Promise<GitHubReviewComment[]> {
    const response = await fetch(
        `https://api.github.com/repos/${repo}/pulls/${prNumber}/comments`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-GitHub-Api-Version": "2022-11-28",
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch PR review comments");
    }

    return response.json();
}

export async function getPRData(
    accessToken: string,
    repo: string,
    prNumber: number
): Promise<PRData> {
    const [pr, comments, reviews, reviewComments] = await Promise.all([
        getPRDetails(accessToken, repo, prNumber),
        getPRComments(accessToken, repo, prNumber),
        getPRReviews(accessToken, repo, prNumber),
        getPRReviewComments(accessToken, repo, prNumber),
    ]);

    return {
        pr,
        comments,
        reviews,
        reviewComments,
    };
}

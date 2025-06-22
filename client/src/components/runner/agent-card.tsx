"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Chip } from "@/components/chip";
import { BACKEND_URL } from "@/lib/globals";
import { Loader2, PlayIcon } from "lucide-react";

export function AgentCard({ logs }: { logs: any }) {
    const [prUrl, setPrUrl] = useState<string | null>(null);

    useEffect(() => {
        const makePR = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/make_pr`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        github_url:
                            "https://github.com/uno-p-5/krazy-vibe-coded-website",
                        issue_description: `You are a code fixer agent. Based on the logs below, please determine the potential problem(s) in the code. You may also use your tools to search the codebase to help you look. If you find issues, please edit the files in order to fix. Do not attempt to run anything.\n\n${JSON.stringify(logs)}`,
                        cleanup: true,
                        branch: "main",
                    }),
                });

                const reader = response.body?.getReader();
                if (!reader) return;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = new TextDecoder().decode(value);
                    const messages = text
                        .split("\n")
                        .filter((msg) => msg.trim());

                    for (const msg of messages) {
                        const data = JSON.parse(msg.replace("data: ", ""));
                        if (data.type === "success") {
                            setPrUrl(data.pr_url);
                        } else if (data.type === "done") {
                            break;
                        }
                    }
                }

                if (prUrl) {
                    console.log("PR URL:", prUrl);
                }
            } catch (error) {
                console.error("Error making PR:", error);
            }
        };

        makePR();
    }, []);

    return (
        <div>
            <div className="border-o-outline flex flex-col gap-y-2 rounded-t-md border p-2">
                <div className="flex flex-col gap-y-1">
                    <span className="text-o-muted text-xs font-medium">
                        Agent
                    </span>
                </div>

                <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-row gap-x-2">
                        <Chip
                            label="Failure"
                            type="failure"
                        />
                        <Chip
                            label="UI/UX"
                            type="ui"
                        />
                    </div>

                    {!prUrl && (
                        <div className="text-o-muted flex flex-row items-center space-x-1">
                            <Loader2 className="size-3 animate-spin" />
                            <span className="text-xs font-medium">
                                Generating Fix
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {prUrl && (
                <div className="text-o-muted bg-o-background-light flex flex-row items-center justify-between rounded-b-md p-2 text-xs">
                    <div className="flex flex-row items-center gap-x-2">
                        <Image
                            src="/claude.png"
                            alt="Claude"
                            width={16}
                            height={16}
                            className="animate-pulse"
                        />
                        <Link
                            href={prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-o-primary"
                        >
                            Github Link
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

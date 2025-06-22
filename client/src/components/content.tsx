"use client";

import { useEffect, useState } from "react";
import { BuilderSidebar } from "@/components/builder/builder-sidebar";
import { Step } from "@/components/builder/single/step";
import { Viewer } from "@/components/builder/viewer";
import { RunnerSidebar } from "@/components/runner/runner-sidebar";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { PRData } from "@/lib/github";
import { useCommandStream } from "@/lib/hooks/use-command-stream";
import { useQueryState } from "nuqs";
import { toast } from "sonner";

export type Step = {
    title: string | null;
    image: string | null;
};
export type Test = {
    id: string;
    title: string;
    url: string;
    steps: Step[];
    status: "enabled" | "disabled";
};

interface ContentProps {
    prData?: PRData | null;
}

const defaultRunId = "d5b395a1-2097-4f8a-b919-7f552f1e7b61";

export function Content({ prData }: ContentProps) {
    const [runId, setRunId] = useQueryState<string | null>("run_id", {
        defaultValue: defaultRunId,
        parse: (value: unknown): string | null => {
            return typeof value === "string" ? value : null;
        },
        history: "replace", // Use replace to avoid adding to history
    });
    useEffect(() => {
        if (!runId) {
            setRunId(defaultRunId);
        } else {
            const url = new URL(window.location.href);
            url.searchParams.set("run_id", runId);
            window.history.replaceState({}, "", url.toString());
        }
    }, [runId, setRunId]);

    const { eventData, sendCommand } = useCommandStream({
        setRunId,
    });

    const [activeSidebar] = useQueryState<"test-builder" | "test-runner">(
        "mode",
        {
            defaultValue: "test-builder",
            parse: (value: unknown): "test-builder" | "test-runner" => {
                return value === "test-runner" ? "test-runner" : "test-builder";
            },
        }
    );

    const [tests, setTests] = useState<Test[]>([
        {
            id: "aa",
            title: "Navigate to peterportal.org",
            url: "https://peterportal.org",
            steps: [
                {
                    title: "Press the x on the pop-up, only if there is one",
                    image: "IMAGE",
                },
                {
                    title: "Click on the 'Professors' tab",
                    image: "IMAGE",
                },
                {
                    title: "Search for professor 'Shindler'",
                    image: "IMAGE",
                },
                {
                    title: "Click on 'CS 162'",
                    image: "IMAGE",
                },
                {
                    title: "Scroll down",
                    image: "IMAGE",
                },
            ],
            status: "enabled",
        },
        {
            id: "sdfsfsf",
            url: "https://docs.python.org/3/library/stdtypes.html#str.parse",
            title: "Navigate to .parse() documentation",
            steps: [
                {
                    title: "Navigate to .parse() documentation",
                    image: "IMAGE",
                },
            ],
            status: "enabled",
        },
    ]);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);

    const activeTest = tests.find((test) => test.id === selectedTest?.id);

    const handleRunTest = () => {
        const commands = ["Navigate to " + activeTest?.url, ...activeTest?.steps.map((step) => step.title as string) as string[]];
        if (!commands?.length) {
            toast.warning("No commands to run");
            return;
        }
        sendCommand(commands, defaultRunId);
    };

    return (
        <div className="bg-o-background flex h-full flex-row">
            <SidebarWrapper
                title="Test Suite"
                show={activeSidebar === "test-builder"}
            >
                <BuilderSidebar
                    activeTest={activeTest}
                    tests={tests}
                    setTests={setTests}
                    setSelectedTest={setSelectedTest}
                    handleRunTest={handleRunTest}
                />
            </SidebarWrapper>

            <Viewer
                prData={prData}
                eventData={eventData}
                activeTest={activeTest}
                runId={runId}
            />

            <SidebarWrapper
                title="Summary"
                show={activeSidebar === "test-runner"}
            >
                <RunnerSidebar />
            </SidebarWrapper>
        </div>
    );
}

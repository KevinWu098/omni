"use client";

import { useState } from "react";
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
    steps: Step[];
    status: "enabled" | "disabled";
};

interface ContentProps {
    prData?: PRData | null;
}

export function Content({ prData }: ContentProps) {
    const { eventData, sendCommand } = useCommandStream();

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
            title: "Navigate to .parse() documentation",
            steps: [
                {
                    title: "Navigate to .parse() documentation",
                    image: "IMAGE",
                },
                {
                    title: "Click first heading",
                    image: "IMAGE",
                },
            ],
            status: "enabled",
        },
        {
            id: "sdfsfsf",
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
        console.log("RUNNING TEST");
        const commands = activeTest?.steps.map((step) => step.title);
        if (!commands?.length) {
            toast.warning("No commands to run");
            return;
        }

        sendCommand(commands?.join("\n"));
    };

    console.log("EVENT DATA", eventData);

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

            <Viewer prData={prData} />

            <SidebarWrapper
                title="Summary"
                show={activeSidebar === "test-runner"}
            >
                <RunnerSidebar />
            </SidebarWrapper>
        </div>
    );
}

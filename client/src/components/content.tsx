"use client";

import { useState } from "react";
import { AllSidePanel } from "@/components/builder/all-side-panel";
import { BuilderSidebar } from "@/components/builder/builder-sidebar";
import { SingleSidePanel } from "@/components/builder/single/single-side-panel";
import { Step } from "@/components/builder/single/step";
import { Viewer } from "@/components/builder/viewer";
import { RunnerSidebar } from "@/components/runner/runner-sidebar";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { useQueryState } from "nuqs";

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

export function Content() {
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
                />
            </SidebarWrapper>

            <Viewer />

            <SidebarWrapper
                title="Summary"
                show={activeSidebar === "test-runner"}
            >
                <RunnerSidebar />
            </SidebarWrapper>
        </div>
    );
}

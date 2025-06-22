"use client";

import { useEffect, useState } from "react";
import { BuilderSidebar } from "@/components/builder/builder-sidebar";
import { Step } from "@/components/builder/single/step";
import { Viewer } from "@/components/builder/viewer";
import { RunnerSidebar } from "@/components/runner/runner-sidebar";
import { RunnerViewer } from "@/components/runner/runner-viewer";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { PRData } from "@/lib/github";
import { useCommandStream } from "@/lib/hooks/use-command-stream";
import { AnimatePresence, motion } from "motion/react";
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
            title: "Navigate to .parse() documentation",
            steps: [
                {
                    title: "Navigate to peterportal.org",
                    image: "IMAGE",
                },
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
                    title: "Click on Shindler's name",
                    image: "IMAGE",
                },
                {
                    title: "Scroll down to the first Review",
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
        const commands = activeTest?.steps.map((step) => step.title);
        if (!commands?.length) {
            toast.warning("No commands to run");
            return;
        }

        sendCommand(commands?.join("\n"), defaultRunId);
    };

    return (
        <div className="bg-o-background flex h-full flex-row">
            <motion.div
                className="h-full"
                initial={{
                    width: activeSidebar === "test-builder" ? "auto" : 0,
                }}
                animate={{
                    width: activeSidebar === "test-builder" ? "auto" : 0,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                <AnimatePresence mode="wait">
                    {activeSidebar === "test-builder" && (
                        <motion.div
                            key="test-builder-sidebar"
                            className="h-full"
                            // initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                            <SidebarWrapper
                                title="Test Suite"
                                show={true}
                            >
                                <BuilderSidebar
                                    activeTest={activeTest}
                                    tests={tests}
                                    setTests={setTests}
                                    setSelectedTest={setSelectedTest}
                                    handleRunTest={handleRunTest}
                                />
                            </SidebarWrapper>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <motion.div
                className="h-full flex-1"
                layout
                transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSidebar}
                        className="h-full"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                        {activeSidebar === "test-builder" ? (
                            <Viewer
                                prData={prData}
                                eventData={eventData}
                                activeTest={activeTest}
                                runId={runId}
                            />
                        ) : (
                            <RunnerViewer
                                runId={runId}
                                eventData={eventData}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </motion.div>

            <motion.div
                className="h-full min-h-full"
                initial={{
                    width: activeSidebar === "test-runner" ? "400px" : 0,
                }}
                animate={{
                    width: activeSidebar === "test-runner" ? "400px" : 0,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                <AnimatePresence mode="wait">
                    {activeSidebar === "test-runner" && (
                        <motion.div
                            key="test-runner-sidebar"
                            className="h-full"
                            // initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 300, opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        >
                            <SidebarWrapper
                                title="Summary"
                                show={true}
                            >
                                <RunnerSidebar />
                            </SidebarWrapper>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

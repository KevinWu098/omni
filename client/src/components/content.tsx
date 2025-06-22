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
import { BACKEND_URL } from "@/lib/globals";

export type Step = {
    title: string | null;
    // image field is no longer used but allowed for backward compatibility
    [key: string]: unknown;
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

const defaultRunId = "";

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

    const { eventData, sendCommand, clearEvents, stepStatuses, clearStepStatuses } = useCommandStream({
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
            ],
            status: "enabled",
        },
        {
            id: "bb",
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
            ],
            status: "enabled",
        },
        {
            id: "cc",
            title: "Check IrvineHacks dinner time",
            url: "https://www.irvinehacks.com",
            steps: [
                {
                    title: "Click on the Schedule tab",
                    image: "IMAGE",
                },
                {
                    title: "Scroll through schedule to find dinner time",
                    image: "IMAGE",
                },
                {
                    title: "Verify dinner time is displayed",
                    image: "IMAGE",
                },
            ],
            status: "enabled",
        },
        {
            id: "dd",
            title: "E-Commerce Website",
            url: "https://krazy-vibe-coded-website.vercel.app/",
            steps: [
                {
                    title: "Click on 'Shop Now'",
                    image: "IMAGE",
                },
                {
                    title: "Click on a product ONLY IF it's on the current page already and make sure it displays properly",
                    image: "IMAGE",
                },
                {
                    title: "Click the 'Home' link in the Navbar",
                    image: "IMAGE",
                },
            ],
            status: "enabled",
        },
    ]);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);

    const activeTest = tests.find((test) => test.id === selectedTest?.id);

    // Add two-arg wrapper for sendCommand
    const sendCommandWrapper = (commands: string[], id: string | undefined) =>
        sendCommand(commands, id, "0");

    // Add callback to update test URL state
    const handleUpdateTestUrl = (newUrl: string) => {
        if (!activeTest) return;
        setTests((prevTests) =>
            prevTests.map((test) =>
                test.id === activeTest.id ? { ...test, url: newUrl } : test
            )
        );
    };

    const handleRunTest = async () => {
        // Shutdown previous browser session if exists
        if (runId) {
            try {
                await fetch(`${BACKEND_URL}/shutdown_run/${runId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ delete_video: true }),
                });
            } catch (err) {
                console.error("Error shutting down previous run:", err);
            }
            // Clear previous logs, statuses, and reset runId
            clearEvents();
            clearStepStatuses();
            setRunId(defaultRunId);
        }

        const commands = [
            "Navigate to " + activeTest?.url,
            ...(activeTest?.steps.map(
                (step) => step.title as string
            ) as string[]),
        ];

        if (!commands?.length) {
            toast.warning("No commands to run");
            return;
        }

        sendCommandWrapper(commands, undefined);
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
                                    runId={runId}
                                    sendCommand={sendCommandWrapper}
                                    stepStatuses={stepStatuses}
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
                                updateTestUrl={handleUpdateTestUrl}
                            />
                        ) : (
                            <RunnerViewer tests={tests} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </motion.div>

            <motion.div
                className="h-full min-h-full"
                initial={{
                    width: activeSidebar === "test-runner" ? "480px" : 0,
                }}
                animate={{
                    width: activeSidebar === "test-runner" ? "480px" : 0,
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
                                <RunnerSidebar
                                    totalTests={tests.length}
                                    instances={Object.keys(eventData).length}
                                />
                            </SidebarWrapper>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Test } from "@/components/content";
import { Timeline } from "@/components/timeline";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoPlayer } from "@/components/ui/video";
import { useCommandStream } from "@/lib/hooks/use-command-stream";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, Loader2Icon } from "lucide-react";

export function RunnerViewer({
    tests,
    setRunnerStats,
}: {
    tests: Test[];
    setRunnerStats: React.Dispatch<
        React.SetStateAction<{
            successCount: number;
            failureCount: number;
            isRunning: boolean;
        }>
    >;
}) {
    const [runIds, setRunIds] = useState<string[]>([]);
    const { eventData, sendCommand } = useCommandStream({
        setRunId: (runId) => {
            setRunIds((prev) => [...prev, runId]);
        },
        setRunnerStats,
    });

    // useEffect(() => {
    //     if (eventData) {
    //         let completed = 0;
    //         let failed = 0;
    //         let isRunning = false;

    //         const allEvents = Object.values(eventData)
    //             .flatMap((events) => events)
    //             .sort((a, b) => b.timeStamp - a.timeStamp);

    //         if (allEvents.length > 0) {
    //             const latestEvent = allEvents.at(0);
    //             if (
    //                 latestEvent?.content.includes(
    //                     "Task completed without success"
    //                 )
    //             ) {
    //                 failed++;
    //                 completed++;
    //             }
    //         }

    //         onStatusUpdate(completed, failed, isRunning);
    //     }
    // }, [eventData, onStatusUpdate]);

    const [activeTab, setActiveTab] = useState<"timeline" | "logs">("logs");
    const [selectedStreamId, setSelectedStreamId] = useState<string>("0");

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const hasStartedStreams = useRef(false);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [activeTab, eventData[selectedStreamId]?.length]);

    const [mode, setMode] = useState<"live" | "dvr">("live");

    // Function to start all streams with slight delay between each
    const startAllStreams = useCallback(async () => {
        const streams = Array.from({ length: 4 }, (_, i) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const test = tests.at(i % 4);
                    if (test) {
                        sendCommand(
                            [
                                "Navigate to " + test.url,
                                ...test.steps.map(
                                    (step) => step.title as string
                                ),
                            ],
                            undefined,
                            i.toString()
                        ).then(resolve);
                    } else {
                        resolve(undefined);
                    }
                }, 0);
            });
        });

        await Promise.all(streams);
    }, [tests, sendCommand]);

    useEffect(() => {
        if (!hasStartedStreams.current && tests.length > 0) {
            hasStartedStreams.current = true;
            void startAllStreams();
        }
    }, [startAllStreams, tests.length]);

    return (
        <ResizablePanelGroup
            direction="vertical"
            className="text-o-white flex w-full flex-col"
        >
            <ResizablePanel
                className="bg-o-background aspect-video w-full"
                defaultSize={65}
            >
                <div className="flex flex-row items-center justify-between px-4 py-3 text-sm font-medium">
                    <span className="relative flex w-24 items-center truncate leading-none">
                        All Agents
                        <ChevronDownIcon className="absolute right-2 w-4" />
                    </span>

                    <span className="flex w-fit grow justify-center truncate overflow-ellipsis leading-none">
                        {" "}
                    </span>

                    <div
                        className="text-o-primary hover:text-o-primary/80 w-24 cursor-pointer text-right leading-none underline underline-offset-2 hover:bg-inherit"
                        onClick={() =>
                            setMode((prev) =>
                                prev === "live" ? "dvr" : "live"
                            )
                        }
                    >
                        {mode === "live" ? "DVR" : "Live"}
                    </div>
                </div>

                {/* <img
                    src="/press.svg"
                    className="absolute bottom-[280px] right-[824px]"
                /> */}

                {runIds.length ? (
                    <div className="grid max-h-[calc(100%-32px)] grid-cols-2 grid-rows-2 gap-1 p-4">
                        {runIds.map((runId) => (
                            <div
                                key={runId}
                                onClick={() => setSelectedStreamId(runId)}
                                className={cn(
                                    "mx-auto flex w-fit cursor-pointer items-center justify-center",
                                    selectedStreamId === runId &&
                                        "ring-o-primary ring-2"
                                )}
                            >
                                <VideoPlayer
                                    mode={mode}
                                    runId={runId}
                                    multiple={true}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-[calc(100%-32px)] w-full items-center justify-center gap-x-2">
                        <span className="text-xl font-semibold">
                            Initializing Agents
                        </span>
                        <Loader2Icon className="text-o-primary size-6 animate-spin duration-500" />
                    </div>
                )}
            </ResizablePanel>

            <ResizableHandle
                className="bg-o-outline min-h-1"
                withHandle
            />

            <ResizablePanel
                className="bg-o-base-foreground"
                defaultSize={35}
            >
                <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                        setActiveTab(value as "timeline" | "logs")
                    }
                    className="flex h-full flex-col"
                >
                    <TabsList className="bg-o-background sticky top-0 z-20 h-fit w-full justify-start rounded-none p-0">
                        <TabsTrigger
                            value="timeline"
                            asChild
                            className="border-o-background data-[state=active]:bg-o-base-background box-border rounded-none border-r"
                        >
                            <div className="bg-o-base-background relative flex w-fit flex-col items-center justify-center px-4 py-2">
                                <span className="text-o-white text-xs font-medium leading-none">
                                    Timeline
                                </span>
                                <div
                                    className={cn(
                                        "bg-o-primary invisible absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2",
                                        activeTab === "timeline" && "visible"
                                    )}
                                />
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="logs"
                            asChild
                            className="border-o-background data-[state=active]:bg-o-base-background box-border rounded-none border-r"
                        >
                            <div className="bg-o-base-background relative flex w-fit flex-col items-center justify-center px-4 py-2">
                                <span className="text-o-white text-xs font-medium leading-none">
                                    Logs
                                </span>
                                <div
                                    className={cn(
                                        "bg-o-primary invisible absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2",
                                        activeTab === "logs" && "visible"
                                    )}
                                />
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-auto">
                        <TabsContent
                            value="timeline"
                            className="mt-0 h-full"
                        >
                            <div className="border-o-background bg-o-base-background box-border h-[calc(100%-28px)] flex-col space-y-2 overflow-auto border-b-2 border-t-2 p-4">
                                <Timeline eventData={eventData} />
                            </div>
                        </TabsContent>

                        <TabsContent
                            value="logs"
                            className="mt-0 h-full overflow-hidden"
                        >
                            <div className="border-o-background bg-o-base-background flex h-[calc(100%-28px)] flex-col border-b-2 border-t-2">
                                <Tabs
                                    value={selectedStreamId}
                                    className="flex h-full flex-col"
                                    onValueChange={(value) =>
                                        setSelectedStreamId(value)
                                    }
                                >
                                    <TabsList className="bg-o-background sticky top-0 z-10 h-fit w-full justify-start rounded-none p-0">
                                        {Object.keys(eventData).map(
                                            (streamId) => (
                                                <TabsTrigger
                                                    key={streamId}
                                                    value={streamId}
                                                    asChild
                                                    className="border-o-background data-[state=active]:bg-o-base-background box-border rounded-none border-r"
                                                >
                                                    <div className="bg-o-base-background relative flex w-fit flex-col items-center justify-center px-4 py-2">
                                                        <span className="text-o-white text-xs font-medium leading-none">
                                                            Agent{" "}
                                                            {parseInt(
                                                                streamId
                                                            ) + 1}
                                                        </span>
                                                        <div
                                                            className={cn(
                                                                "bg-o-primary invisible absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2",
                                                                selectedStreamId ===
                                                                    streamId &&
                                                                    "visible"
                                                            )}
                                                        />
                                                    </div>
                                                </TabsTrigger>
                                            )
                                        )}
                                    </TabsList>

                                    <div className="flex-1 overflow-auto">
                                        {Object.entries(eventData).length ? (
                                            Object.entries(eventData).map(
                                                ([streamId, events]) => (
                                                    <TabsContent
                                                        key={streamId}
                                                        value={streamId}
                                                        className="mt-0 h-full p-4"
                                                    >
                                                        {events.length ? (
                                                            <ScrollArea
                                                                ref={
                                                                    scrollAreaRef
                                                                }
                                                            >
                                                                {events.map(
                                                                    (
                                                                        event,
                                                                        index
                                                                    ) => {
                                                                        if (
                                                                            event &&
                                                                            event.type ===
                                                                                "log"
                                                                        ) {
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        index
                                                                                    }
                                                                                    className="font-mono"
                                                                                    ref={
                                                                                        index ===
                                                                                        events.length -
                                                                                            1
                                                                                            ? scrollAreaRef
                                                                                            : null
                                                                                    }
                                                                                >
                                                                                    &gt;
                                                                                    {event.content
                                                                                        .split(
                                                                                            "]"
                                                                                        )
                                                                                        .at(
                                                                                            1
                                                                                        )}
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    }
                                                                )}
                                                            </ScrollArea>
                                                        ) : (
                                                            <div className="text-o-primary my-auto flex h-full items-center justify-center">
                                                                Agent logs will
                                                                display here.
                                                            </div>
                                                        )}
                                                    </TabsContent>
                                                )
                                            )
                                        ) : (
                                            <div className="text-o-primary my-auto flex h-full items-center justify-center">
                                                Agent logs will display here.
                                            </div>
                                        )}
                                    </div>
                                </Tabs>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

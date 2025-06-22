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

export function RunnerViewer({ tests }: { tests: Test[] }) {
    const [runIds, setRunIds] = useState<string[]>([]);
    const { eventData, sendCommand } = useCommandStream({
        setRunId: (runId) => {
            setRunIds((prev) => [...prev, runId]);
        },
    });

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
            className="flex w-full flex-col text-o-white"
        >
            <ResizablePanel
                className="aspect-video w-full bg-o-background"
                defaultSize={65}
            >
                <div className="flex flex-row items-center justify-between px-4 py-3 text-sm font-medium">
                    <span className="relative flex w-24 items-center truncate leading-none">
                        All Agents
                        <ChevronDownIcon className="absolute right-2 w-4" />
                    </span>

                    <span className="flex w-fit grow justify-center truncate overflow-ellipsis leading-none">
                        https://staging-1720.scikit-learn.com/
                    </span>

                    <div
                        className="w-24 cursor-pointer text-right leading-none text-o-primary underline underline-offset-2 hover:bg-inherit hover:text-o-primary/80"
                        onClick={() =>
                            setMode((prev) =>
                                prev === "live" ? "dvr" : "live"
                            )
                        }
                    >
                        {mode === "live" ? "DVR" : "Live"}
                    </div>
                </div>

                <img
                    src="/press.svg"
                    className="absolute bottom-[280px] right-[824px]"
                />

                {runIds.length ? (
                    <div className="grid max-h-[calc(100%-32px)] grid-cols-2 grid-rows-2 gap-1 p-4">
                        {runIds.map((runId) => (
                            <div
                                key={runId}
                                onClick={() => setSelectedStreamId(runId)}
                                className={cn(
                                    "mx-auto flex w-fit cursor-pointer items-center justify-center",
                                    selectedStreamId === runId &&
                                        "ring-2 ring-o-primary"
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
                className="min-h-1 bg-o-outline"
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
                    <TabsList className="sticky top-0 z-20 h-fit w-full justify-start rounded-none bg-o-background p-0">
                        <TabsTrigger
                            value="timeline"
                            asChild
                            className="box-border rounded-none border-r border-o-background data-[state=active]:bg-o-base-background"
                        >
                            <div className="relative flex w-fit flex-col items-center justify-center bg-o-base-background px-4 py-2">
                                <span className="text-xs font-medium leading-none text-o-white">
                                    Timeline
                                </span>
                                <div
                                    className={cn(
                                        "invisible absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2 bg-o-primary",
                                        activeTab === "timeline" && "visible"
                                    )}
                                />
                            </div>
                        </TabsTrigger>
                        <TabsTrigger
                            value="logs"
                            asChild
                            className="box-border rounded-none border-r border-o-background data-[state=active]:bg-o-base-background"
                        >
                            <div className="relative flex w-fit flex-col items-center justify-center bg-o-base-background px-4 py-2">
                                <span className="text-xs font-medium leading-none text-o-white">
                                    Logs
                                </span>
                                <div
                                    className={cn(
                                        "invisible absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2 bg-o-primary",
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
                            <div className="box-border h-[calc(100%-28px)] flex-col space-y-2 overflow-auto border-b-2 border-t-2 border-o-background bg-o-base-background p-4">
                                <Timeline eventData={eventData} />
                            </div>
                        </TabsContent>

                        <TabsContent
                            value="logs"
                            className="mt-0 h-full overflow-hidden"
                        >
                            <div className="flex h-[calc(100%-28px)] flex-col border-b-2 border-t-2 border-o-background bg-o-base-background">
                                <Tabs
                                    value={selectedStreamId}
                                    className="flex h-full flex-col"
                                    onValueChange={(value) =>
                                        setSelectedStreamId(value)
                                    }
                                >
                                    <TabsList className="sticky top-0 z-10 h-fit w-full justify-start rounded-none bg-o-background p-0">
                                        {Object.keys(eventData).map(
                                            (streamId) => (
                                                <TabsTrigger
                                                    key={streamId}
                                                    value={streamId}
                                                    asChild
                                                    className="box-border rounded-none border-r border-o-background data-[state=active]:bg-o-base-background"
                                                >
                                                    <div className="relative flex w-fit flex-col items-center justify-center bg-o-base-background px-4 py-2">
                                                        <span className="text-xs font-medium leading-none text-o-white">
                                                            Agent{" "}
                                                            {parseInt(
                                                                streamId
                                                            ) + 1}
                                                        </span>
                                                        <div
                                                            className={cn(
                                                                "invisible absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2 bg-o-primary",
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

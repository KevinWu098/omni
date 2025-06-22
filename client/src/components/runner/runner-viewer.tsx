"use client";

import { useEffect, useRef, useState } from "react";
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
import {
    ArrowLeftIcon,
    ChevronDownIcon,
    MessagesSquareIcon,
} from "lucide-react";

export function RunnerViewer() {
    const [runIds, setRunIds] = useState<string[]>([]);
    const { eventData, sendCommand } = useCommandStream({
        setRunId: (runId) => {
            setRunIds((prev) => [...prev, runId]);
        },
    });

    console.log("data", eventData);
    console.log("runIds", runIds);

    const [activeTab, setActiveTab] = useState<"timeline" | "logs">("timeline");
    const [selectedStreamId, setSelectedStreamId] = useState<string>("0");

    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [activeTab, eventData[selectedStreamId]?.length]);

    const [mode, setMode] = useState<"live" | "dvr">("live");

    // Function to start all streams
    const startAllStreams = async () => {
        await Promise.all(
            Array.from({ length: 2 }, (_, i) => {
                const streamId = i.toString();
                // Start each stream independently without waiting for others
                return sendCommand(
                    [
                        "Navigate to peterportal.org",
                        "Press the x on the pop-up, only if there is one",
                        "Click on the 'Professors' tab",
                        "Search for professor 'Shindler'",
                        "Click on Shindler's name",
                        "Scroll down to the first Review",
                    ],
                    undefined,
                    streamId
                );
            })
        );
    };

    useEffect(() => {
        void startAllStreams();
    }, []);

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
                        https://staging-1720.scikit-learn.com/
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

                {runIds.length ? (
                    <div className="grid max-h-[calc(100%-32px)] grid-cols-4 grid-rows-4 gap-1 p-4">
                        {runIds.map((runId) => (
                            <div
                                key={runId}
                                onClick={() => setSelectedStreamId(runId)}
                                className={cn(
                                    "w-fit cursor-pointer",
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
                    <div className="flex h-[calc(100%-32px)] w-full items-center justify-center">
                        No run ID
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
                            className="data-[state=active]:bg-o-base-background border-o-background box-border rounded-none border-r"
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
                                                    className="data-[state=active]:bg-o-base-background border-o-background box-border rounded-none border-r"
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
                                        {Object.entries(eventData).map(
                                            ([streamId, events]) => (
                                                <TabsContent
                                                    key={streamId}
                                                    value={streamId}
                                                    className="mt-0 h-full p-4"
                                                >
                                                    {events.length ? (
                                                        <ScrollArea
                                                            ref={scrollAreaRef}
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

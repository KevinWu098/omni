"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/chip";
import { CommentCard } from "@/components/comment-card";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoPlayer } from "@/components/ui/video";
import { EventData } from "@/lib/hooks/use-command-stream";
import { cn } from "@/lib/utils";
import {
    ArrowLeftIcon,
    ChevronDownIcon,
    MessagesSquareIcon,
} from "lucide-react";

interface ViewerProps {
    eventData?: EventData[];
    runId: string | null;
}

export function RunnerViewer({ eventData, runId }: ViewerProps) {
    const [activeTab, setActiveTab] = useState<"timeline">("timeline");

    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [activeTab, eventData?.length]);

    const [mode, setMode] = useState<"live" | "dvr">("live");

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

                {runId ? (
                    <VideoPlayer
                        mode={mode}
                        runId={runId}
                    />
                ) : (
                    <div className="flex h-[calc(100%-32px)] w-full items-center justify-center">
                        No run ID
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
                    onValueChange={(value) => setActiveTab(value as "timeline")}
                    className="h-full"
                >
                    {/* <TabsList className="h-fit w-full justify-start rounded-none bg-o-background p-0">
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
                    </TabsList> */}

                    <TabsContent
                        value="timeline"
                        className="mt-0 h-full"
                    >
                        <div className="box-border h-full flex-col space-y-2 overflow-auto border-b-2 border-t-2 border-o-background bg-o-base-background">
                            <Timeline />
                        </div>
                    </TabsContent>
                </Tabs>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

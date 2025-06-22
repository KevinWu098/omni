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
import { ArrowLeftIcon, MessagesSquareIcon } from "lucide-react";

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
            className="text-o-white flex w-full flex-col"
        >
            <ResizablePanel
                className="bg-o-background aspect-video w-full"
                defaultSize={65}
            >
                <div className="flex flex-row items-center justify-between px-4 py-3 font-medium">
                    <span className="w-24 truncate leading-none">
                        All Agents
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
                className="bg-o-outline min-h-1"
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
                    <TabsList className="bg-o-background h-fit w-full justify-start rounded-none p-0">
                        <TabsTrigger
                            value="timeline"
                            asChild
                            className="data-[state=active]:bg-o-base-background border-o-background box-border rounded-none border-r"
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
                    </TabsList>

                    <TabsContent
                        value="timeline"
                        className="mt-0 h-full"
                    >
                        <div className="border-o-background bg-o-base-background box-border h-[calc(100%-28px)] flex-col space-y-2 overflow-auto border-b-2 border-t-2 p-4">
                            <Timeline />
                        </div>
                    </TabsContent>
                </Tabs>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

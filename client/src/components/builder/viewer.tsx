"use client";

import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ArrowLeftIcon, MessagesSquareIcon } from "lucide-react";

export function Viewer() {
    return (
        <ResizablePanelGroup
            direction="vertical"
            className="flex w-full flex-col text-o-white"
        >
            <ResizablePanel className="aspect-video w-full bg-o-muted">
                <div className="flex flex-row items-center justify-between p-4 font-medium">
                    <span className="leading-none">Demo</span>
                    <span className="leading-none">
                        https://staging-1720.scikit-learn.com/
                    </span>
                    <span className="invisible leading-none">Demo</span>
                </div>
                DISPLAY
            </ResizablePanel>

            <ResizableHandle
                className="min-h-1 bg-o-outline"
                withHandle
            />

            <ResizablePanel className="bg-o-base-foreground">
                <div className="flex-col border-b-2 border-o-background bg-o-base-background px-4 py-[10px]">
                    <div className="flex w-full items-center justify-between">
                        <span className="font-medium">
                            feat: implement Google Calendar event overlay #177
                        </span>
                        <div>
                            <span>Add Diff Here</span>
                        </div>
                    </div>
                    <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-1">
                            <span className="rounded-sm bg-o-green/10 px-2 py-1 outline outline-o-green">
                                main
                            </span>
                            <ArrowLeftIcon
                                size={16}
                                className="text-o-muted"
                            />
                            <span className="rounded-sm bg-o-green/10 px-2 py-1 outline outline-o-green">
                                174-fetch-google-calendar-data
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-o-muted">
                            <MessagesSquareIcon size={14} />
                            <span>53</span>
                        </div>
                    </div>
                </div>
                DETAILS
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

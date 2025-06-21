"use client";

import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { GripHorizontalIcon } from "lucide-react";

export function Content() {
    return (
        <ResizablePanelGroup
            direction="vertical"
            className="text-o-white flex w-full flex-col"
        >
            <ResizablePanel className="bg-o-muted aspect-video w-full">
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
                className="bg-o-outline min-h-1"
                withHandle
            />

            <ResizablePanel>DETAILS</ResizablePanel>
        </ResizablePanelGroup>
    );
}

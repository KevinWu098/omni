import Image from "next/image";
import { Chip } from "@/components/chip";
import { PlayIcon } from "lucide-react";

export function AgentCard() {
    return (
        <div>
            <div className="border-o-outline flex flex-col gap-y-2 rounded-t-md border p-2">
                <div className="flex flex-col gap-y-1">
                    <span className="text-o-muted text-xs font-medium">
                        Agent 1
                    </span>
                    <span className="text-o-white text-sm font-medium">
                        issue: no relevant results found for `.parse()`
                    </span>
                </div>

                <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-row gap-x-2">
                        <Chip
                            label="Failure"
                            type="failure"
                        />
                        <Chip
                            label="UI/UX"
                            type="ui"
                        />
                    </div>

                    <div className="text-o-muted flex flex-row items-center space-x-1">
                        <PlayIcon className="size-3" />
                        <span className="text-xs font-medium">00:02:21:20</span>
                    </div>
                </div>
            </div>

            <div className="text-o-muted bg-o-background-light flex flex-row items-center justify-between rounded-b-md p-2 text-xs">
                <div className="flex flex-row items-center gap-x-2">
                    <Image
                        src="/claude.png"
                        alt="Claude"
                        width={16}
                        height={16}
                    />
                    <span>Running Claude Code</span>
                </div>

                <span>0.4s</span>
            </div>
        </div>
    );
}

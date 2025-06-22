import { BigText } from "@/components/big-text";
import { MediumText } from "@/components/medium-text";
import { AgentCard } from "@/components/runner/agent-card";
import { HourglassIcon } from "lucide-react";

export function RunnerSidebar() {
    return (
        <>
            <div className="flex flex-col gap-y-4 px-2 py-6">
                <div className="flex flex-row items-start justify-between">
                    <div className="flex flex-row gap-10 px-4">
                        <BigText
                            label="Total Tests"
                            value="27"
                        />
                        <BigText
                            label="Active Instances"
                            value="3/32"
                        />
                    </div>

                    <div className="flex flex-row items-center gap-x-1 px-4 text-o-white">
                        <span className="text-sm">Running</span>
                        <HourglassIcon className="size-4 animate-pulse text-o-green" />
                    </div>
                </div>

                <div className="flex flex-row gap-10 px-4">
                    <MediumText
                        label="Success"
                        value="2"
                        type="success"
                    />
                    <MediumText
                        label="Failure"
                        value="4"
                        type="failure"
                    />
                    <MediumText
                        label="Warning"
                        value="17"
                        type="warning"
                    />
                    <MediumText
                        label="Nit"
                        value="4"
                        type="nit"
                    />
                </div>
            </div>

            <div className="box-border flex flex-col gap-y-4 border-t-2 border-o-background p-4">
                <AgentCard />
                <AgentCard />
                <AgentCard />
                <AgentCard />
            </div>
        </>
    );
}

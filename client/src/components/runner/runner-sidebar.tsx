import { BigText } from "@/components/big-text";
import { Test } from "@/components/content";
import { MediumText } from "@/components/medium-text";
import { AgentCard } from "@/components/runner/agent-card";
import { HourglassIcon } from "lucide-react";

export function RunnerSidebar({
    totalTests,
    instances,
}: {
    totalTests: number;
    instances: number;
}) {
    return (
        <>
            <div className="flex flex-col gap-y-4 px-2 py-6">
                <div className="flex flex-row items-start justify-between">
                    <div className="flex flex-row gap-10 px-4">
                        <BigText
                            label="Total Tests"
                            value={totalTests.toString()}
                        />
                        <BigText
                            label="Active Instances"
                            value={`${instances}/16`}
                        />
                    </div>

                    <div className="text-o-white flex flex-row items-center gap-x-1 px-4">
                        <span className="text-sm">Running</span>
                        <HourglassIcon className="text-o-green size-4 animate-pulse" />
                    </div>
                </div>

                <div className="flex flex-row gap-10 px-4">
                    <MediumText
                        label="Success"
                        value="..."
                        type="success"
                    />
                    <MediumText
                        label="Failure"
                        value="..."
                        type="failure"
                    />
                    {/* <MediumText
                        label="Warning"
                        value="..."
                        type="warning"
                    />
                    <MediumText
                        label="Nit"
                        value="..."
                        type="nit"
                    /> */}
                </div>
            </div>

            <div className="border-o-background box-border flex flex-col gap-y-4 border-t-2 p-4">
                <AgentCard />
            </div>
        </>
    );
}

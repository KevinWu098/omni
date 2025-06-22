"use client";

import { useState } from "react";
import { AllSidePanel } from "@/components/builder/all-side-panel";
import { SingleSidePanel } from "@/components/builder/single/single-side-panel";
import { Step } from "@/components/builder/single/step";
import { Viewer } from "@/components/builder/viewer";

export type Step = {
    title: string | null;
    image: string | null;
};
export type Test = {
    id: string;
    title: string;
    steps: Step[];
    status: "enabled" | "disabled";
};

export function Content() {
    const [tests, setTests] = useState<Test[]>([
        {
            id: "aa",
            title: "Navigate to .parse() documentation",
            steps: [
                {
                    title: "Navigate to .parse() documentation",
                    image: "IMAGE",
                },
                {
                    title: "Click first heading",
                    image: "IMAGE",
                },
            ],
            status: "enabled",
        },
        {
            id: "sdfsfsf",
            title: "Navigate to .parse() documentation",
            steps: [
                {
                    title: "Navigate to .parse() documentation",
                    image: "IMAGE",
                },
            ],
            status: "enabled",
        },
        {
            id: "fasdfasdfdsa",
            title: "Navigate to .parse() documentation",
            steps: [
                {
                    title: "Navigate to .parse() documentation",
                    image: "IMAGE",
                },
            ],
            status: "enabled",
        },
    ]);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);

    const handleTestClick = (test: Test) => {
        setSelectedTest(test);
    };

    const activeTest = tests.find((test) => test.id === selectedTest?.id);

    return (
        <div className="bg-o-background flex h-full flex-row">
            <div className="border-o-background relative w-[400px] min-w-[400px]">
                <div className="bg-o-base-background relative flex w-fit flex-col items-center justify-center px-4 py-2">
                    <span className="text-o-white text-xs font-medium leading-none">
                        Test Suite
                    </span>
                    <div className="bg-o-primary absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2" />
                </div>

                <div className="bg-o-base-background text-o-white box-border flex h-[calc(100%-30px)] flex-col border-r-2 border-t-2 border-[#141414]">
                    {activeTest ? (
                        <SingleSidePanel
                            activeTest={activeTest}
                            tests={tests}
                            setTests={setTests}
                            setSelectedTest={setSelectedTest}
                        />
                    ) : (
                        <AllSidePanel
                            tests={tests}
                            handleTestClick={handleTestClick}
                            setTests={setTests}
                        />
                    )}
                </div>
            </div>

            <Viewer />
        </div>
    );
}

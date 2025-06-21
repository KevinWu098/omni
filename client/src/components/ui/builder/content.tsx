"use client";

import { useState } from "react";
import { AllSidePanel } from "@/components/ui/builder/all-side-panel";
import { Step } from "@/components/ui/builder/single/step";
import { TestCard, type Test } from "@/components/ui/builder/test-card";
import { Viewer } from "@/components/ui/builder/viewer";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export function Content() {
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);

    const handleTestClick = (test: Test) => {
        setSelectedTest(test);
    };

    return (
        <div className="bg-o-background flex h-full flex-row">
            <div className="border-o-background relative w-[500px]">
                <div className="bg-o-base-background relative flex w-fit flex-col items-center justify-center px-4 py-2">
                    <span className="text-o-white text-xs font-medium leading-none">
                        Test Suite
                    </span>
                    <div className="bg-o-primary absolute bottom-0 left-1/2 h-[2px] w-1/2 -translate-x-1/2 translate-y-1/2" />
                </div>

                {selectedTest ? (
                    <div className="bg-o-base-background text-o-white flex h-[calc(100%-30px)] flex-col">
                        <TestCard
                            {...selectedTest}
                            handleTestClick={() => setSelectedTest(null)}
                        />

                        <div className="border-o-background flex grow flex-col gap-y-4 border-t p-4">
                            <Step />

                            <div className="border-outline border-o-muted-dark hover:border-o-muted group flex w-full justify-center rounded-md border border-dashed p-2 hover:cursor-pointer">
                                <PlusIcon className="text-o-muted group-hover:text-o-muted-light size-4" />
                            </div>
                        </div>

                        <div className="ring-o-outline mx-4 mb-4 mt-auto flex flex-row justify-end rounded-md p-2 ring-1">
                            <div className="flex flex-row gap-x-2">
                                <Button
                                    variant={"ghost"}
                                    className="hover:bg-inherit hover:text-inherit"
                                >
                                    Cancel
                                </Button>
                                <Button variant={"default"}>Save</Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <AllSidePanel handleTestClick={handleTestClick} />
                )}
            </div>

            <Viewer />
        </div>
    );
}

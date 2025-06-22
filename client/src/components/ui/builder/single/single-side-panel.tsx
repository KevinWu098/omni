import { useState } from "react";
import { type Test } from "@/components/ui/builder/content";
import { Step } from "@/components/ui/builder/single/step";
import { TestCard } from "@/components/ui/builder/test-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";

export function SingleSidePanel({
    activeTest,
    tests,
    setTests,
    setSelectedTest,
}: {
    activeTest: Test;
    tests: Test[];
    setTests: React.Dispatch<React.SetStateAction<Test[]>>;
    setSelectedTest: React.Dispatch<React.SetStateAction<Test | null>>;
}) {
    const [creatingStep, setCreatingStep] = useState<boolean>(false);

    const isInvalidStep = activeTest?.steps.at(-1)?.title === null;

    const handleAddStep = () => {
        if (!activeTest) return;

        setTests((prevTests) =>
            prevTests.map((test) =>
                test.id === activeTest.id
                    ? {
                          ...test,
                          steps: [...test.steps, { title: null, image: null }],
                      }
                    : test
            )
        );
        setCreatingStep(true);
    };

    const handleSaveStep = () => {
        // Only save if the step has a title
        const lastStep = activeTest?.steps.at(-1);

        if (lastStep?.title) {
            setCreatingStep(false);
        }
    };

    const handleCancelStep = () => {
        const newTests: Test[] = [];
        for (const test of tests) {
            if (test.id === activeTest?.id) {
                newTests.push({
                    ...test,
                    steps: test.steps.slice(0, -1),
                });
            } else {
                newTests.push(test);
            }
        }

        setTests(newTests);

        setCreatingStep(false);
    };

    const handleUpdateStepTitle = (title: string) => {
        setTests((prevTests) =>
            prevTests.map((test) =>
                test.id === activeTest?.id
                    ? {
                          ...test,
                          steps: test.steps.map((step, i) =>
                              i === test.steps.length - 1
                                  ? { ...step, title }
                                  : step
                          ),
                      }
                    : test
            )
        );
    };

    return (
        <>
            <TestCard
                {...activeTest}
                handleTestClick={null}
            />

            <div className="border-o-background flex max-h-[calc(100%-200px)] grow flex-col gap-y-4 border-t p-4">
                <ScrollArea className="flex flex-1 flex-col gap-y-4">
                    {activeTest?.steps.map((step, index) => (
                        <Step
                            key={index}
                            index={index}
                            updateStepTitle={handleUpdateStepTitle}
                            {...step}
                        />
                    ))}
                </ScrollArea>

                {creatingStep ? (
                    <div className="flex w-full flex-row gap-x-2">
                        <Button
                            variant={"ghost"}
                            className={cn(
                                "border-o-muted-dark hover:border-o-muted flex w-full flex-row items-center gap-x-1 rounded-md border border-dashed p-2 hover:cursor-pointer",
                                "hover:bg-inherit hover:text-inherit"
                            )}
                            onClick={handleCancelStep}
                        >
                            <span className="text-o-red/80 flex w-full items-center justify-center space-x-1 text-sm leading-none">
                                <p>Cancel</p>
                                <XIcon className="size-4" />
                            </span>
                        </Button>
                        <Button
                            variant={"ghost"}
                            className={cn(
                                "border-o-muted-dark hover:border-o-muted flex w-full flex-row items-center gap-x-1 rounded-md border border-dashed p-2 hover:cursor-pointer",
                                "hover:bg-inherit hover:text-inherit"
                            )}
                            disabled={isInvalidStep}
                            onClick={handleSaveStep}
                        >
                            <span className="text-o-green flex w-full items-center justify-center space-x-1 text-sm leading-none">
                                <p>Save</p>
                                <CheckIcon className="size-4" />
                            </span>
                        </Button>
                    </div>
                ) : (
                    <div
                        className={cn(
                            "border-outline border-o-muted-dark hover:border-o-muted group flex w-full justify-center rounded-md border border-dashed p-2 hover:cursor-pointer"
                        )}
                        onClick={handleAddStep}
                    >
                        <span className="text-o-primary flex flex-row items-center gap-x-1 text-sm leading-none">
                            Add Step
                            <PlusIcon className="size-4" />
                        </span>
                    </div>
                )}
            </div>

            <div className="ring-o-outline mx-4 mb-4 mt-auto flex flex-row justify-end rounded-md p-2 ring-1">
                <div className="flex flex-row gap-x-2">
                    <Button
                        variant={"ghost"}
                        className="hover:bg-inherit hover:text-inherit"
                        onClick={() => setSelectedTest(null)}
                    >
                        Cancel
                    </Button>
                    <Button variant={"default"}>Save</Button>
                </div>
            </div>
        </>
    );
}

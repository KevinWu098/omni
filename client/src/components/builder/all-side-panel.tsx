import { BigText } from "@/components/big-text";
import { TestCard } from "@/components/builder/test-card";
import { type Test } from "@/components/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PlusSquareIcon, SearchIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useQueryState } from "nuqs";

export function AllSidePanel({
    tests,
    handleTestClick,
    setTests,
}: {
    tests: Test[];
    handleTestClick: (test: Test) => void;
    setTests: React.Dispatch<React.SetStateAction<Test[]>>;
}) {
    const [, setMode] = useQueryState<"test-builder" | "test-runner">("mode", {
        defaultValue: "test-builder",
        parse: (value: unknown): "test-builder" | "test-runner" => {
            return value === "test-runner" ? "test-runner" : "test-builder";
        },
    });

    const handleAddTest = () => {
        setTests((prevTests) => {
            const newTestCount = prevTests.filter((test) =>
                test.title.startsWith("New Test")
            ).length;
            const title =
                newTestCount > 0 ? `New Test (${newTestCount})` : "New Test";

            return [
                ...prevTests,
                {
                    id: String(prevTests.length + 1),
                    title,
                    steps: [],
                    status: "disabled",
                },
            ];
        });
    };

    return (
        <>
            <div className="flex flex-col gap-y-4 p-4 pt-6">
                <div className="flex flex-row gap-10">
                    <BigText
                        label="Total Tests"
                        value="27"
                    />
                    <BigText
                        label="Total Tests"
                        value="27"
                    />
                </div>

                <div className="flex flex-col gap-y-2">
                    <Input
                        placeholder="Find Test"
                        startIcon={SearchIcon}
                    />
                    {/* TODO: Fix Select styling */}
                    <Select>
                        <SelectTrigger className="bg-o-background-light focus-visible:ring-o-muted h-8 w-full p-2">
                            <SelectValue placeholder="Sort Order" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="recent">Recent</SelectItem>
                            <SelectItem value="alphabetical">
                                Alphabetical
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <ScrollArea className="flex max-h-[calc(100%-260px)] flex-1 flex-col">
                <AnimatePresence initial={false}>
                    {tests.map((testCard) => (
                        <TestCard
                            key={testCard.id}
                            {...testCard}
                            handleTestClick={handleTestClick}
                            setTests={null}
                        />
                    ))}
                </AnimatePresence>
            </ScrollArea>

            <div className="ring-o-outline mx-4 mb-4 mt-auto flex flex-row items-center justify-between rounded-md p-2 ring-1">
                <PlusSquareIcon
                    className="text-o-muted size-5 hover:cursor-pointer"
                    onClick={handleAddTest}
                />

                <div className="flex flex-row gap-x-2">
                    <Button
                        variant={"destructive"}
                        onClick={() => setMode("test-runner")}
                    >
                        Run All Tests
                    </Button>
                </div>
            </div>
        </>
    );
}

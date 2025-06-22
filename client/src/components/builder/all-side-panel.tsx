import { type Test } from "@/components/builder/content";
import { TestCard } from "@/components/builder/test-card";
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

export function AllSidePanel({
    tests,
    handleTestClick,
    setTests,
}: {
    tests: Test[];
    handleTestClick: (test: Test) => void;
    setTests: React.Dispatch<React.SetStateAction<Test[]>>;
}) {
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
                    <div className="flex flex-col font-medium">
                        <span className="text-xs">Total Tests</span>
                        <span className="text-3xl">27</span>
                    </div>
                    <div className="flex flex-col font-medium">
                        <span className="text-xs">Total Tests</span>
                        <span className="text-3xl">27</span>
                    </div>
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
                {tests.map((testCard, index) => (
                    <TestCard
                        key={index}
                        {...testCard}
                        handleTestClick={handleTestClick}
                    />
                ))}
            </ScrollArea>

            <div className="ring-o-outline mx-4 mb-4 mt-auto flex flex-row items-center justify-between rounded-md p-2 ring-1">
                <PlusSquareIcon
                    className="text-o-muted size-5 hover:cursor-pointer"
                    onClick={handleAddTest}
                />

                <div className="flex flex-row gap-x-2">
                    <Button variant={"destructive"}>Run All Tests</Button>
                </div>
            </div>
        </>
    );
}

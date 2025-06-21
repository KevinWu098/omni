import { TestCard, type Test } from "@/components/ui/builder/test-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PlusSquareIcon, SearchIcon } from "lucide-react";

const TEST_CARDS: Test[] = [
    {
        title: "Navigate to .parse() documentation",
        steps: 3,
        status: "enabled",
    },
    {
        title: "Navigate to .parse() documentation",
        steps: 3,
        status: "enabled",
    },
    {
        title: "Navigate to .parse() documentation",
        steps: 3,
        status: "enabled",
    },
];

export function AllSidePanel({
    handleTestClick,
}: {
    handleTestClick: (test: Test) => void;
}) {
    return (
        <div className="bg-o-base-background text-o-white box-border flex h-[calc(100%-30px)] flex-col border-r-2 border-t-2 border-[#141414]">
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

            <div className="flex flex-1 flex-col">
                {TEST_CARDS.map((testCard, index) => (
                    <TestCard
                        key={index}
                        {...testCard}
                        handleTestClick={handleTestClick}
                    />
                ))}
            </div>

            <div className="ring-o-outline mx-4 mb-4 mt-auto flex flex-row items-center justify-between rounded-md p-2 ring-1">
                <PlusSquareIcon className="text-o-muted size-5" />

                <div className="flex flex-row gap-x-2">
                    {/* <Button
                                variant={"ghost"}
                                className="hover:bg-inherit hover:text-inherit"
                            >
                                Edit
                            </Button> */}
                    <Button variant={"destructive"}>Run All Tests</Button>
                </div>
            </div>
        </div>
    );
}

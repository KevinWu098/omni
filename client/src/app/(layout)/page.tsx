import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SearchIcon } from "lucide-react";

export default function Page() {
    return (
        <div className="bg-o-background flex h-full flex-row">
            <div className="border-o-background w-[400px]">
                <div className="bg-o-base-background relative flex w-fit flex-col items-center justify-center px-4 py-2">
                    <span className="text-o-white text-xs font-medium leading-none">
                        Test Suite
                    </span>
                    <div className="bg-o-primary absolute bottom-0 left-1/2 h-[2px] w-1/2 -translate-x-1/2 translate-y-1/2" />
                </div>

                <div className="bg-o-base-background text-o-white box-border h-full border-r-2 border-t-2 border-[#141414]">
                    <div className="flex flex-col gap-2 p-4">
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

                    <div>SIDE PANEL</div>
                </div>
            </div>
            <div>MAIN CONTENT</div>
        </div>
    );
}

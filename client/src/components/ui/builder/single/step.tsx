import { useState } from "react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

export function Step() {
    const [open, setOpen] = useState(true);

    const Icon = open ? ChevronUpIcon : ChevronDownIcon;

    return (
        <Collapsible
            className="border-o-outline peer rounded-md border p-2"
            open={open}
            onOpenChange={setOpen}
        >
            <CollapsibleTrigger className="text-o-muted flex w-full flex-row items-center justify-between text-xs font-medium">
                <span>Step 1</span>
                <Icon className="size-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="text-o-white">
                <span className="text-sm font-medium">
                    Navigate to landing page
                </span>
            </CollapsibleContent>
        </Collapsible>
    );
}

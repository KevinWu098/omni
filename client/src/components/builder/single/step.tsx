import { useState } from "react";
import { type Step } from "@/components/builder/content";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
    CheckIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    PencilIcon,
} from "lucide-react";

export function Step({
    index,
    updateStepTitle,
    ...step
}: Step & { index: number; updateStepTitle: (title: string) => void }) {
    const [open, setOpen] = useState(true);
    const [creatingTitle, setCreatingTitle] = useState("");
    const [editingTitle, setEditingTitle] = useState(step.title === null);

    const Icon = open ? ChevronUpIcon : ChevronDownIcon;

    return (
        <Collapsible
            className="border-o-outline peer space-y-1 rounded-md border p-2"
            open={open}
            onOpenChange={setOpen}
        >
            <CollapsibleTrigger className="text-o-muted flex w-full flex-row items-center justify-between text-xs font-medium">
                <span>Step {index + 1}</span>
                <Icon className="size-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="text-o-white space-y-2">
                {step.title ? (
                    <span className="text-sm font-medium">{step.title}</span>
                ) : (
                    <div className="flex flex-row items-center justify-between gap-x-2">
                        <Input
                            placeholder="What should the agent do?"
                            value={creatingTitle}
                            disabled={!editingTitle}
                            onChange={(e) => setCreatingTitle(e.target.value)}
                            className="border-o-muted"
                        />
                        <Button
                            variant={editingTitle ? "default" : "secondary"}
                            className="px-4"
                            disabled={!creatingTitle && editingTitle}
                            onClick={() => {
                                setEditingTitle(!editingTitle);
                                if (editingTitle) {
                                    updateStepTitle(creatingTitle);
                                }
                            }}
                        >
                            {editingTitle ? <CheckIcon /> : <PencilIcon />}
                        </Button>
                    </div>
                )}

                {step.image && (
                    <div className="border-o-outline mt-1 flex items-center justify-center rounded-md border text-sm">
                        {step.image}
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}

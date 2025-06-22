import { useState } from "react";
import { type Step } from "@/components/content";
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
    XIcon,
    Loader2Icon,
} from "lucide-react";

export type StepState = 'success' | 'failure' | 'running' | 'skipped';

interface StepProps extends Step {
    index: number;
    updateStepTitle: (title: string) => void;
    state?: StepState;
}

export function Step({
    index,
    updateStepTitle,
    state,
    ...step
}: StepProps) {
    const [open, setOpen] = useState(true);
    const [creatingTitle, setCreatingTitle] = useState("");
    const [editingTitle, setEditingTitle] = useState(step.title === null);

    const Icon = open ? ChevronUpIcon : ChevronDownIcon;

    return (
        <Collapsible
            className="peer space-y-1 rounded-md border border-o-outline p-2"
            open={open}
            onOpenChange={setOpen}
        >
            <CollapsibleTrigger className="flex w-full flex-row items-center justify-between text-xs font-medium text-o-muted">
                <div className="flex items-center gap-1">
                    <span>Step {index + 1}</span>
                    {state === 'success' && (
                        <>
                            <CheckIcon className="text-o-green size-4" />
                            <span className="text-o-green text-xs">Successfully Passed</span>
                        </>
                    )}
                    {state === 'failure' && (
                        <>
                            <XIcon className="text-o-red size-4" />
                            <span className="text-o-red text-xs">Error Detected</span>
                        </>
                    )}
                    {state === 'running' && (
                        <>
                            <Loader2Icon className="text-o-muted size-4 animate-spin" />
                            <span className="text-o-muted text-xs">Running Step</span>
                        </>
                    )}
                    {state === 'skipped' && <span className="text-o-muted text-xs">Skipped</span>}
                </div>
                <Icon className="size-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 text-o-white">
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
                    <div className="mt-1 flex items-center justify-center rounded-md border border-o-outline text-sm">
                        {step.image}
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}

"use client";

import { Chip } from "@/components/chip";
import { CommentCard } from "@/components/comment-card";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ArrowLeftIcon, MessagesSquareIcon } from "lucide-react";

// Sample comment data
const sampleComments = [
    {
        id: 1,
        username: "alice_dev",
        content:
            "This looks great! The calendar integration is working perfectly. I especially like how you handled the timezone conversion - that was a tricky part. The UI is clean and the user experience feels smooth. One small suggestion: maybe we could add a loading state while the calendar events are being fetched?",
    },
    {
        id: 2,
        username: "bob_reviewer",
        content:
            "I noticed a small issue with the timezone handling. Can we fix that? When I tested it in different timezones, some events were showing up at the wrong times. Also, I think we should add some error handling for when the Google Calendar API is unavailable. The rest of the implementation looks solid though!",
    },
    {
        id: 3,
        username: "carol_qa",
        content:
            "Tested this on different browsers and it's working as expected. Ready for merge! I went through Chrome, Firefox, Safari, and Edge - all good. The responsive design holds up well on mobile too. Just a heads up that I found one minor visual glitch on Safari where the calendar overlay sometimes flickers, but it doesn't affect functionality.",
    },
    {
        id: 4,
        username: "dave_lead",
        content:
            "Great work on this feature. The UI is clean and intuitive. I appreciate how you followed our design system guidelines and kept the code well-organized. This is exactly the kind of quality we want to maintain. Let's get this merged and deployed to staging for final testing.",
    },
    {
        id: 5,
        username: "emma_frontend",
        content:
            "Love the implementation! The component structure is really clean and reusable. I was thinking we could potentially extract the calendar overlay logic into a custom hook for better reusability across other parts of the app. Also, the TypeScript types are well-defined - that's going to save us a lot of debugging time.",
    },
    {
        id: 6,
        username: "frank_backend",
        content:
            "The API integration looks solid. I like how you're caching the calendar data to avoid hitting rate limits. One thing to consider: we might want to add a background job to refresh the cache periodically, especially for users with frequently changing calendars. The error handling on the backend side is also well thought out.",
    },
];

export function Viewer() {
    return (
        <ResizablePanelGroup
            direction="vertical"
            className="flex w-full flex-col text-o-white"
        >
            <ResizablePanel className="aspect-video w-full bg-o-muted">
                <div className="flex flex-row items-center justify-between p-4 font-medium">
                    <span className="leading-none">Demo</span>
                    <span className="leading-none">
                        https://staging-1720.scikit-learn.com/
                    </span>
                    <span className="invisible leading-none">Demo</span>
                </div>
                DISPLAY
            </ResizablePanel>

            <ResizableHandle
                className="min-h-1 bg-o-outline"
                withHandle
            />

            <ResizablePanel className="bg-o-base-foreground">
                <div className="flex-col space-y-2 border-b-2 border-o-background bg-o-base-background px-4 py-2">
                    <div className="flex w-full items-center justify-between">
                        <span className="font-medium">
                            feat: implement Google Calendar event overlay #177
                        </span>
                        <div>
                            <span>Add Diff Here</span>
                        </div>
                    </div>
                    <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-1">
                            <Chip
                                label="main"
                                type="branch"
                            />
                            <ArrowLeftIcon
                                size={16}
                                className="text-o-muted"
                            />
                            <Chip
                                label="174-fetch-google-calendar-data"
                                type="branch"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-o-muted">
                            <span>53</span>
                            <MessagesSquareIcon size={14} />
                        </div>
                    </div>
                </div>
                <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-4">
                    {sampleComments.map((comment) => (
                        <CommentCard
                            key={comment.id}
                            comment={comment}
                        />
                    ))}
                </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

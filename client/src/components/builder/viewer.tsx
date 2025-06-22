"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Chip } from "@/components/chip";
import { CommentCard } from "@/components/comment-card";
import { Test } from "@/components/content";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoPlayer } from "@/components/ui/video";
import { PRData } from "@/lib/github";
import { EventData, StreamsEventData } from "@/lib/hooks/use-command-stream";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, MessagesSquareIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

// Sample comment data (fallback when no PR data)
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

interface ViewerProps {
    prData?: PRData | null;
    eventData?: StreamsEventData;
    activeTest: Test | undefined;
    runId: string | null;
    updateTestUrl: (newUrl: string) => void;
}

export function Viewer({ prData, eventData, activeTest, runId, updateTestUrl }: ViewerProps) {
    const [activeTab, setActiveTab] = useState<"github" | "logs">("github");

    const title = prData ? (
        <>
            {prData.pr.title}{" "}
            <span className="text-o-muted">#{prData.pr.number}</span>
        </>
    ) : (
        "feat: implement Google Calendar event overlay #177"
    );

    const baseBranch = prData?.pr.base.ref || "main";
    const headBranch = prData?.pr.head.ref || "174-fetch-google-calendar-data";

    // Combine all comments into a timeline sorted by date
    const comments = prData
        ? (() => {
              const allComments = [];

              // Add PR body as first comment
              if (prData.pr.body) {
                  allComments.push({
                      id: `pr-body-${prData.pr.id}`,
                      username: prData.pr.user.login,
                      content: prData.pr.body,
                      avatar_url: prData.pr.user.avatar_url,
                      created_at: prData.pr.created_at,
                      type: "description",
                  });
              }

              // Add general comments
              prData.comments.forEach((comment) => {
                  allComments.push({
                      id: `comment-${comment.id}`,
                      username: comment.user.login,
                      content: comment.body,
                      avatar_url: comment.user.avatar_url,
                      created_at: comment.created_at,
                      type: "comment",
                  });
              });

              // Add reviews
              prData.reviews.forEach((review) => {
                  if (review.body) {
                      const reviewStateEmoji = {
                          APPROVED: "✅",
                          CHANGES_REQUESTED: "🔄",
                          COMMENTED: "💬",
                      };

                      allComments.push({
                          id: `review-${review.id}`,
                          username: review.user.login,
                          content: `${reviewStateEmoji[review.state]} ${review.body}`,
                          avatar_url: review.user.avatar_url,
                          created_at: review.submitted_at,
                          type: "review",
                      });
                  }
              });

              // Add review comments (inline code comments)
              prData.reviewComments.forEach((reviewComment) => {
                  allComments.push({
                      id: `review-comment-${reviewComment.id}`,
                      username: reviewComment.user.login,
                      content: `📝 On ${reviewComment.path}${reviewComment.line ? `:${reviewComment.line}` : ""}\n\n${reviewComment.body}`,
                      avatar_url: reviewComment.user.avatar_url,
                      created_at: reviewComment.created_at,
                      type: "review_comment",
                  });
              });

              // Sort by date
              return allComments.sort(
                  (a, b) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime()
              );
          })()
        : sampleComments;

    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [activeTab, eventData]);

    useEffect(() => {
        if (runId) {
            setActiveTab("logs");
        }
    }, [runId]);

    const [mode, setMode] = useState<"live" | "dvr">("live");

    return (
        <ResizablePanelGroup
            direction="vertical"
            className="text-o-white flex w-full flex-col"
        >
            <ResizablePanel
                className="bg-o-background aspect-video w-full"
                defaultSize={65}
            >
                <div className="flex flex-row items-center justify-between px-4 py-3 text-sm font-medium">
                    <span className="w-24 truncate leading-none">Demo</span>

                    <div className="flex grow px-2">
                        <Input
                            type="text"
                            value={activeTest?.url || ""}
                            onChange={(e) => updateTestUrl(e.target.value)}
                            className="text-sm"
                        />
                    </div>

                    <div
                        className="text-o-primary hover:text-o-primary/80 w-24 cursor-pointer text-right leading-none underline underline-offset-2 hover:bg-inherit"
                        onClick={() =>
                            setMode((prev) =>
                                prev === "live" ? "dvr" : "live"
                            )
                        }
                    >
                        {mode === "live" ? "DVR" : "Live"}
                    </div>
                </div>

                {runId ? (
                    <VideoPlayer
                        mode={mode}
                        runId={runId}
                    />
                ) : (
                    <div className="flex h-[calc(100%-32px)] w-full items-center justify-center">
                        Awaiting agent initialization...
                    </div>
                )}
            </ResizablePanel>

            <ResizableHandle
                className="bg-o-outline min-h-1"
                withHandle
            />

            <ResizablePanel
                className="bg-o-base-foreground"
                defaultSize={35}
            >
                <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                        setActiveTab(value as "github" | "logs")
                    }
                    className="h-full"
                >
                    <TabsList className="bg-o-background h-fit w-full justify-start rounded-none p-0">
                        <TabsTrigger
                            value="github"
                            asChild
                            className="border-o-background data-[state=active]:bg-o-base-background box-border rounded-none border-r"
                        >
                            <div className="bg-o-base-background relative flex w-fit flex-col items-center justify-center px-4 py-2">
                                <span className="text-o-white text-xs font-medium leading-none">
                                    Github
                                </span>
                                <div
                                    className={cn(
                                        "bg-o-primary invisible absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2",
                                        activeTab === "github" && "visible"
                                    )}
                                />
                            </div>
                        </TabsTrigger>

                        <TabsTrigger
                            value="logs"
                            asChild
                            className="data-[state=active]:bg-o-base-background rounded-none"
                            disabled={!activeTest}
                        >
                            <div className="bg-o-base-background relative flex w-fit flex-col items-center justify-center px-4 py-2">
                                <span className="text-o-white text-xs font-medium leading-none">
                                    Agent Logs
                                </span>
                                <div
                                    className={cn(
                                        "bg-o-primary invisible absolute bottom-0 left-1/2 h-[2px] w-3/4 -translate-x-1/2 translate-y-1/2",
                                        activeTab === "logs" && "visible"
                                    )}
                                />
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent
                        value="github"
                        className="mt-0 h-full"
                    >
                        <div className="border-o-background bg-o-base-background box-border flex-col space-y-2 border-b-2 border-t-2 p-4">
                            <div className="flex w-full items-center justify-between">
                                <span className="font-medium">{title}</span>
                                <div className="flex items-center gap-[2px]">
                                    <span className="text-o-green text-sm font-medium">
                                        +1,139
                                    </span>
                                    <span className="text-o-red text-sm font-medium">
                                        -571
                                    </span>
                                    <div className="w-1" />
                                    <div className="bg-o-green h-[10px] w-[10px]" />
                                    <div className="bg-o-green h-[10px] w-[10px]" />
                                    <div className="bg-o-green h-[10px] w-[10px]" />
                                    <div className="bg-o-red h-[10px] w-[10px]" />
                                    <div className="border-o-muted-medium box-border h-[10px] w-[10px] border-[1.5px]" />
                                </div>
                            </div>
                            <div className="flex w-full items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <Chip
                                        label={baseBranch}
                                        type="branch"
                                    />
                                    <ArrowLeftIcon
                                        size={16}
                                        className="text-o-muted"
                                    />
                                    <Chip
                                        label={headBranch}
                                        type="branch"
                                    />
                                </div>
                                <div className="text-o-muted flex items-center gap-2 text-sm">
                                    <span>{comments.length}</span>
                                    <MessagesSquareIcon size={14} />
                                </div>
                            </div>
                        </div>
                        <ScrollArea className="h-[calc(100%-100px)]">
                            <div className="flex flex-col gap-4 px-4 py-4">
                                {comments.map((comment) => (
                                    <CommentCard
                                        key={comment.id}
                                        comment={comment}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent
                        value="logs"
                        className="mt-0 h-full"
                    >
                        <div className="border-o-background bg-o-base-background box-border h-[calc(100%-28px)] flex-col space-y-2 overflow-auto border-b-2 border-t-2 p-4">
                            {eventData && Object.keys(eventData)?.length ? (
                                <ScrollArea ref={scrollAreaRef}>
                                    {eventData["0"]?.map((event, index) => {
                                        if (event && event.type === "log") {
                                            return (
                                                <div
                                                    key={index}
                                                    className="font-mono"
                                                    ref={
                                                        eventData["0"]
                                                            ?.length &&
                                                        index ===
                                                            eventData["0"]
                                                                ?.length -
                                                                1
                                                            ? scrollAreaRef
                                                            : null
                                                    }
                                                >
                                                    &gt; {event.content}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </ScrollArea>
                            ) : (
                                <div className="text-o-primary my-auto flex h-full items-center justify-center">
                                    Agent logs will display here.
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}

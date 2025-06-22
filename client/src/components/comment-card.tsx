import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface Comment {
    id: number | string;
    username: string;
    content: string;
    avatar_url?: string;
}

interface CommentCardProps {
    comment: Comment;
}

export function CommentCard({ comment }: CommentCardProps) {
    return (
        <div className="flex w-full gap-2">
            {comment.avatar_url ? (
                <img
                    src={comment.avatar_url}
                    alt={`${comment.username}'s avatar`}
                    className="box-border h-10 w-10 rounded-full border border-o-outline bg-o-background-light object-cover"
                />
            ) : (
                <div className="box-border h-10 w-10 rounded-full border border-o-outline bg-o-background-light" />
            )}
            <div className="box-border flex w-full flex-col rounded-md border border-o-outline p-2">
                <div className="flex flex-col gap-y-1">
                    <span className="text-xs font-medium text-o-muted">
                        {comment.username}
                    </span>
                    <div className="prose prose-invert prose-sm max-w-none text-sm text-o-white">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                                // Style links
                                a: ({ href, children, ...props }) => (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 underline hover:text-blue-300"
                                        {...props}
                                    >
                                        {children}
                                    </a>
                                ),
                                // Style images (both markdown and HTML)
                                img: ({
                                    src,
                                    alt,
                                    width,
                                    height,
                                    ...props
                                }) => (
                                    <img
                                        src={src}
                                        alt={alt}
                                        width={width}
                                        height={height}
                                        className="h-auto max-w-full rounded border border-o-outline"
                                        loading="lazy"
                                        {...props}
                                    />
                                ),
                                // Style code blocks
                                pre: ({ children, ...props }) => (
                                    <pre
                                        className="overflow-x-auto rounded border border-o-outline bg-o-background-light p-2"
                                        {...props}
                                    >
                                        {children}
                                    </pre>
                                ),
                                // Style inline code
                                code: ({ children, ...props }) => (
                                    <code
                                        className="rounded bg-o-background-light px-1 py-0.5 text-xs"
                                        {...props}
                                    >
                                        {children}
                                    </code>
                                ),
                                // Style blockquotes
                                blockquote: ({ children, ...props }) => (
                                    <blockquote
                                        className="border-l-4 border-o-outline pl-4 italic text-o-muted"
                                        {...props}
                                    >
                                        {children}
                                    </blockquote>
                                ),
                                // Keep paragraphs compact
                                p: ({ children, ...props }) => (
                                    <p
                                        className="mb-2 last:mb-0"
                                        {...props}
                                    >
                                        {children}
                                    </p>
                                ),
                            }}
                        >
                            {comment.content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface Comment {
    id: number;
    username: string;
    content: string;
}

interface CommentCardProps {
    comment: Comment;
}

export function CommentCard({ comment }: CommentCardProps) {
    return (
        <div className="flex w-full gap-2">
            <div className="box-border h-10 w-10 rounded-full border border-o-outline bg-o-background-light" />
            <div className="box-border flex w-full flex-col rounded-md border border-o-outline p-2">
                <div className="flex flex-col gap-y-1">
                    <span className="text-xs font-medium text-o-muted">
                        {comment.username}
                    </span>
                    <span className="text-sm text-o-white">
                        {comment.content}
                    </span>
                </div>
            </div>
        </div>
    );
}

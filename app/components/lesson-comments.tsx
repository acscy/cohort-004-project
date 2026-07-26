import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { UserAvatar } from "~/components/user-avatar";

type Comment = {
  id: number;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  isInstructor: boolean;
};

export function LessonComments({
  lessonId,
  comments,
  canComment,
  canDeleteComments,
}: {
  lessonId: number;
  comments: Comment[];
  canComment: boolean;
  canDeleteComments: boolean;
}) {
  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <h2 className="mb-4 text-xl font-semibold">
          Comments ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No comments yet.
          </p>
        ) : (
          <div>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                canDelete={canDeleteComments}
              />
            ))}
          </div>
        )}

        {canComment && <CommentForm lessonId={lessonId} />}
      </CardContent>
    </Card>
  );
}

function CommentForm({ lessonId }: { lessonId: number }) {
  const fetcher = useFetcher<{ newComment?: unknown }>({
    key: `add-comment-${lessonId}`,
  });
  const [value, setValue] = useState("");
  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.newComment) {
      setValue("");
    }
  }, [fetcher.data]);

  return (
    <div className="mt-4 flex flex-col gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a comment..."
        disabled={isSubmitting}
      />
      <Button
        size="sm"
        className="self-end"
        disabled={isSubmitting || value.trim().length === 0}
        onClick={() => {
          fetcher.submit(
            { intent: "add-comment", body: value },
            { method: "post" }
          );
        }}
      >
        {isSubmitting ? "Posting..." : "Post Comment"}
      </Button>
    </div>
  );
}

function CommentItem({
  comment,
  canDelete,
}: {
  comment: Comment;
  canDelete: boolean;
}) {
  const fetcher = useFetcher({ key: `delete-comment-${comment.id}` });
  const isDeleting = fetcher.state !== "idle";

  return (
    <div className="flex gap-3 border-b border-border py-4 last:border-0">
      <UserAvatar name={comment.authorName} avatarUrl={comment.authorAvatarUrl} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{comment.authorName}</span>
          {comment.isInstructor && (
            <Badge variant="instructor">Instructor</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleString()}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
      </div>
      {canDelete && (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isDeleting}
          onClick={() => {
            fetcher.submit(
              { intent: "delete-comment", commentId: String(comment.id) },
              { method: "post" }
            );
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

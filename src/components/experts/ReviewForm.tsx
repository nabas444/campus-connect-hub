import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./StarRating";
import { toast } from "@/hooks/use-toast";
import { submitReview } from "@/lib/experts";
import { Loader2 } from "lucide-react";

interface ReviewFormProps {
  expertId: string;
  projectId: string;
  reviewerId: string;
  initialRating?: number;
  initialComment?: string;
  onSubmitted?: () => void;
}

export function ReviewForm({ expertId, projectId, reviewerId, initialRating = 0, initialComment = "", onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      toast({ title: "Pick a rating", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await submitReview({ expertId, projectId, reviewerId, rating, comment });
      toast({ title: initialRating ? "Review updated" : "Review submitted" });
      onSubmitted?.();
    } catch (err: any) {
      toast({ title: "Failed to submit", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Your rating</p>
        <StarRating value={rating} size="lg" interactive onChange={setRating} />
      </div>
      <Textarea
        placeholder="Share what worked well…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      <Button onClick={submit} disabled={busy} variant="hero">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {initialRating ? "Update review" : "Submit review"}
      </Button>
    </div>
  );
}
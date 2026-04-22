import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (v: number) => void;
  className?: string;
}

const sizeMap = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-7 w-7" } as const;

export function StarRating({ value, count, size = "md", interactive, onChange, className }: StarRatingProps) {
  const cls = sizeMap[size];
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <div className="inline-flex">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= Math.round(value);
          const StarEl = (
            <Star
              className={cn(cls, filled ? "fill-accent text-accent" : "text-muted-foreground/40")}
            />
          );
          return interactive ? (
            <button
              key={n}
              type="button"
              onClick={() => onChange?.(n)}
              className="rounded-sm transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
            >
              {StarEl}
            </button>
          ) : (
            <span key={n}>{StarEl}</span>
          );
        })}
      </div>
      {count != null && (
        <span className="text-xs text-muted-foreground">
          {value > 0 ? value.toFixed(1) : "—"} ({count})
        </span>
      )}
    </div>
  );
}
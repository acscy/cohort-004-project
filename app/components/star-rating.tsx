import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Star } from "lucide-react";
import { cn } from "~/lib/utils";

export function StarRating({
  rating,
  size = 16,
  className,
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  const filled = Math.round(rating);
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < filled
              ? "fill-yellow-400 text-yellow-400"
              : "fill-none text-muted-foreground"
          }
        />
      ))}
    </span>
  );
}

export function StarRatingSummary({
  average,
  count,
  size = 16,
  className,
}: {
  average: number;
  count: number;
  size?: number;
  className?: string;
}) {
  if (count === 0) {
    return (
      <span
        className={cn(
          "flex items-center gap-1.5 text-sm text-muted-foreground",
          className
        )}
      >
        <StarRating rating={0} size={size} />
        No ratings yet
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-1.5 text-sm", className)}>
      <StarRating rating={average} size={size} />
      <span className="font-medium">{average.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({count} {count === 1 ? "review" : "reviews"})
      </span>
    </span>
  );
}

export function StarRatingInput({
  defaultValue = 0,
  size = 22,
  className,
}: {
  defaultValue?: number;
  size?: number;
  className?: string;
}) {
  const fetcher = useFetcher({ key: "rate-course" });
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState(defaultValue);

  useEffect(() => {
    setSelected(defaultValue);
  }, [defaultValue]);

  const displayValue = hovered ?? selected;
  const submitting = fetcher.state !== "idle";

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            disabled={submitting}
            onMouseEnter={() => setHovered(starValue)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              setSelected(starValue);
              fetcher.submit(
                { intent: "rate-course", rating: String(starValue) },
                { method: "post" }
              );
            }}
            className="disabled:opacity-50"
          >
            <Star
              size={size}
              className={
                starValue <= displayValue
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-muted-foreground"
              }
            />
          </button>
        );
      })}
    </span>
  );
}

import { useState } from "react";
import { Link, data, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/admin.analytics";
import { getAllCourses } from "~/services/courseService";
import {
  getPlatformAnalyticsSummary,
  type PlatformAnalyticsSummary,
  type PlatformRange,
} from "~/services/analyticsService";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { UserRole } from "~/db/schema";
import { formatPrice } from "~/lib/utils";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Trophy,
  Users,
} from "lucide-react";

export function meta() {
  return [
    { title: "Analytics — Cadence" },
    {
      name: "description",
      content: "Platform-wide revenue and enrollment analytics",
    },
  ];
}

const PLATFORM_RANGES: PlatformRange[] = ["7d", "30d", "12m", "all"];
const RANGE_LABELS: Record<PlatformRange, string> = {
  "7d": "7d",
  "30d": "30d",
  "12m": "12m",
  all: "All",
};
const DEFAULT_RANGE: PlatformRange = "30d";

export async function loader({ request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Select a user from the DevUI panel to view analytics.", {
      status: 401,
    });
  }

  const user = getUserById(currentUserId);

  if (!user || user.role !== UserRole.Admin) {
    throw data("Only admins can access this page.", {
      status: 403,
    });
  }

  const summaryByRange = Object.fromEntries(
    PLATFORM_RANGES.map((range) => [range, getPlatformAnalyticsSummary(range)])
  ) as Record<PlatformRange, PlatformAnalyticsSummary>;

  const hasCourses = getAllCourses().length > 0;

  return { summaryByRange, hasCourses };
}

export default function AdminAnalytics({ loaderData }: Route.ComponentProps) {
  const { summaryByRange, hasCourses } = loaderData;
  const [range, setRange] = useState<PlatformRange>(DEFAULT_RANGE);
  const summary = summaryByRange[range];

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Analytics</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Platform-wide revenue and enrollment across all instructors
          </p>
        </div>

        {hasCourses && (
          <div className="flex items-center gap-1">
            {PLATFORM_RANGES.map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={r === range ? "default" : "outline"}
                className="h-8 px-3 text-xs"
                onClick={() => setRange(r)}
              >
                {RANGE_LABELS[r]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {!hasCourses ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="mb-4 size-12 text-muted-foreground/50" />
          <h2 className="text-lg font-medium">No data yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Analytics will appear once instructors publish courses and students
            start enrolling.
          </p>
        </div>
      ) : (
        <SummaryCards summary={summary} />
      )}
    </div>
  );
}

function SummaryCards({ summary }: { summary: PlatformAnalyticsSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="size-4" />
            Total revenue
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPrice(summary.totalRevenueCents)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            Total enrollments
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalEnrollments}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="size-4" />
            Top earning course
          </div>
        </CardHeader>
        <CardContent>
          {summary.topEarningCourse ? (
            <>
              <div
                className="truncate text-2xl font-bold"
                title={summary.topEarningCourse.title}
              >
                {summary.topEarningCourse.title}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPrice(summary.topEarningCourse.revenueCents)}
              </p>
            </>
          ) : (
            <div className="text-2xl font-bold text-muted-foreground">—</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred while loading analytics.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 401) {
      title = "Sign in required";
      message =
        typeof error.data === "string"
          ? error.data
          : "Please select a user from the DevUI panel.";
    } else if (error.status === 403) {
      title = "Access denied";
      message =
        typeof error.data === "string"
          ? error.data
          : "You don't have permission to access this page.";
    } else {
      title = `Error ${error.status}`;
      message = typeof error.data === "string" ? error.data : error.statusText;
    }
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

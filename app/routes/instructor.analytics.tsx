import { Link, data, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/instructor.analytics";
import { getCoursesByInstructor } from "~/services/courseService";
import {
  getCourseRevenueSeries,
  getCourseCompletionRate,
  getCourseRatingMetrics,
  getCourseRevenueTrend,
  getCourseTotalRevenue,
  type RevenueRange,
} from "~/services/analyticsService";
import { RevenueChart } from "~/components/revenue-chart";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { UserRole } from "~/db/schema";
import { formatPrice } from "~/lib/utils";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { AlertTriangle, CheckCircle2, GraduationCap, Star } from "lucide-react";
import { Button } from "~/components/ui/button";

export function meta() {
  return [
    { title: "Analytics — Cadence" },
    { name: "description", content: "Revenue, completion, and rating analytics for your courses" },
  ];
}

const REVENUE_RANGES: RevenueRange[] = ["7d", "30d", "90d"];

function buildRevenueByRange(courseId: number) {
  return Object.fromEntries(
    REVENUE_RANGES.map((range) => [range, getCourseRevenueSeries(courseId, range)])
  ) as Record<RevenueRange, ReturnType<typeof getCourseRevenueSeries>>;
}

export async function loader({ request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Select a user from the DevUI panel to view analytics.", {
      status: 401,
    });
  }

  const user = getUserById(currentUserId);

  if (!user || user.role !== UserRole.Instructor) {
    throw data("Only instructors can access this page.", {
      status: 403,
    });
  }

  const instructorCourses = getCoursesByInstructor(currentUserId);

  const courses = instructorCourses.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    revenueByRange: buildRevenueByRange(course.id),
    completionRate: getCourseCompletionRate(course.id),
    ratingMetrics: getCourseRatingMetrics(course.id),
    trend: getCourseRevenueTrend(course.id),
  }));

  const totalRevenueCents = instructorCourses.reduce(
    (sum, course) => sum + getCourseTotalRevenue(course.id),
    0
  );

  return { courses, totalRevenueCents };
}

function sortByNeedsAttention<T extends { trend: { percentChange: number | null } }>(
  courses: T[]
): T[] {
  return [...courses].sort((a, b) => {
    if (a.trend.percentChange === null && b.trend.percentChange === null) return 0;
    if (a.trend.percentChange === null) return 1;
    if (b.trend.percentChange === null) return -1;
    return a.trend.percentChange - b.trend.percentChange;
  });
}

export default function InstructorAnalytics({ loaderData }: Route.ComponentProps) {
  const { courses, totalRevenueCents } = loaderData;

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

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Revenue, completion, and rating across your courses
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="mb-4 size-12 text-muted-foreground/50" />
          <h2 className="text-lg font-medium">No courses yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a course to start seeing analytics.
          </p>
          <Link to="/instructor/new" className="mt-4">
            <Button>Create Course</Button>
          </Link>
        </div>
      ) : courses.length === 1 ? (
        <SingleCourseAnalytics course={courses[0]!} />
      ) : (
        <MultiCourseAnalytics courses={courses} totalRevenueCents={totalRevenueCents} />
      )}
    </div>
  );
}

function SingleCourseAnalytics({
  course,
}: {
  course: Route.ComponentProps["loaderData"]["courses"][number];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Completion rate
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {course.completionRate.eligibleEnrollments > 0
                ? `${Math.round(course.completionRate.completionRate * 100)}%`
                : "—"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {course.completionRate.completedEnrollments} of{" "}
              {course.completionRate.eligibleEnrollments} eligible{" "}
              {course.completionRate.eligibleEnrollments === 1 ? "student" : "students"}
              {course.completionRate.recentEnrollments > 0 &&
                ` · ${course.completionRate.recentEnrollments} recent ${
                  course.completionRate.recentEnrollments === 1 ? "enrollment" : "enrollments"
                } excluded`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="size-4" />
              Average rating
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {course.ratingMetrics.count > 0 ? course.ratingMetrics.average.toFixed(1) : "—"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {course.ratingMetrics.count} {course.ratingMetrics.count === 1 ? "review" : "reviews"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Revenue</h2>
          <p className="text-sm text-muted-foreground">
            Daily revenue for {course.title}. Toggle the range to zoom in or out.
          </p>
        </CardHeader>
        <CardContent>
          <RevenueChart seriesByRange={course.revenueByRange} />
        </CardContent>
      </Card>
    </div>
  );
}

function MultiCourseAnalytics({
  courses,
  totalRevenueCents,
}: {
  courses: Route.ComponentProps["loaderData"]["courses"];
  totalRevenueCents: number;
}) {
  const sortedCourses = sortByNeedsAttention(courses);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="text-sm text-muted-foreground">Total revenue, all courses</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatPrice(totalRevenueCents)}</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedCourses.map((course) => (
          <Card key={course.id}>
            <CardHeader>
              <Link
                to={`/instructor/${course.id}`}
                className="font-semibold leading-tight hover:text-primary"
              >
                {course.title}
              </Link>
            </CardHeader>
            <CardContent>
              <RevenueChart
                seriesByRange={course.revenueByRange}
                defaultRange="30d"
                showRangeToggle={false}
                compact
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred while loading analytics.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 401) {
      title = "Sign in required";
      message = typeof error.data === "string" ? error.data : "Please select a user from the DevUI panel.";
    } else if (error.status === 403) {
      title = "Access denied";
      message = typeof error.data === "string" ? error.data : "You don't have permission to access this page.";
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
          <Link to="/instructor">
            <Button variant="outline">My Courses</Button>
          </Link>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

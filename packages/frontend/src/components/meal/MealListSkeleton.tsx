// T080: Loading skeletons for photo carousels
export function MealListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Two skeleton groups (days) */}
      {[1, 2].map((groupIndex) => (
        <div key={groupIndex}>
          {/* Date header skeleton */}
          <div className="mb-3 h-5 w-48 animate-pulse rounded bg-gray-200" />

          <div className="space-y-3">
            {/* 2-3 meal cards per group */}
            {[1, 2].map((cardIndex) => (
              <div
                key={cardIndex}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3">
                  {/* Photo carousel skeleton */}
                  <div className="relative">
                    <div className="h-48 w-full animate-pulse rounded-lg bg-gray-200" />
                    {/* Indicator dots */}
                    <div className="mt-2 flex justify-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    </div>
                  </div>

                  {/* Content skeleton */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Meal type badge and time */}
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
                        <div className="h-6 w-12 animate-pulse rounded-full bg-gray-200" />
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                      </div>

                      {/* Content text */}
                      <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />

                      {/* Nutrition info */}
                      <div className="flex gap-2">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

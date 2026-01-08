export function ExerciseListSkeleton() {
  return (
    <div className="space-y-2">
      {/* 3 skeleton items */}
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 space-y-2">
              {/* Exercise name */}
              <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />

              {/* Muscle group badge */}
              <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
            </div>

            {/* Timestamp */}
            <div className="h-4 w-12 animate-pulse rounded bg-gray-200 ml-2" />
          </div>

          {/* Display sets */}
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

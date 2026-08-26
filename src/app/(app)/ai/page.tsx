import { Suspense } from "react";
import { AssistantScreen } from "@/components/ai/AssistantScreen";
import { Skeleton } from "@/components/ui/Primitives";

export default function AiPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Suspense fallback={<AssistantFallback />}>
        <AssistantScreen />
      </Suspense>
    </div>
  );
}

function AssistantFallback() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-4">
      <Skeleton className="h-32 w-32 rounded-full" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

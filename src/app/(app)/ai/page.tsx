import { Suspense } from "react";
import { AssistantScreen } from "@/components/ai/AssistantScreen";
import { Skeleton } from "@/components/ui/Primitives";

export default function AiPage() {
  return (
    <Suspense fallback={<AssistantFallback />}>
      <AssistantScreen />
    </Suspense>
  );
}

function AssistantFallback() {
  return (
    <div className="flex h-dvh flex-col gap-3 px-4 pt-20">
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="ml-auto h-11 w-2/3 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}

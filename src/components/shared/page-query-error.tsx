import { DetailHeading } from "@/components/paper/section";
import { ErrorState } from "@/components/shared/error-state";

/** A failed read is neither an empty register nor a zero-valued summary. */
export function PageQueryError({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <DetailHeading>{title}</DetailHeading>
      <ErrorState
        title={`Unable to load ${title.toLowerCase()}`}
        description="We couldn’t retrieve the data for this page. Please try again."
      />
    </div>
  );
}

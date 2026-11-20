import { Inbox } from "lucide-react";
import { PermissionLink as Link } from "@/components/shared/permission-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "paper-card rounded-2xl bg-card flex flex-col items-center justify-center px-5 py-12 text-center sm:py-16",
        className
      )}
    >
      <div aria-hidden="true" className="relative mb-5 flex size-16 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground shadow-xs [&_svg]:size-7 [&_svg]:stroke-[1.5]">
        {icon ?? <Inbox />}
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-2">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground max-w-sm">
        {description}
      </p>
      {action && (action.href ? (
        <Button asChild className="mt-6"><Link href={action.href}>{action.label}</Link></Button>
      ) : (
        <Button className="mt-6" onClick={action.onClick}>{action.label}</Button>
      ))}
    </div>
  );
}

"use client";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/paper/primitives";
import { Button } from "@/components/ui/button";
export function SearchNoResults({ onClear }: {onClear: () => void}) {
  return <EmptyState icon={<Search />} title="No records match your search" description="Try another name or phrase, or clear the search to see the loaded records." action={<Button variant="outline" onClick={onClear}>Clear search</Button>} />;
}

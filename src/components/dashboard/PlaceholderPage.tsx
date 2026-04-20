import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>

      <Card className="p-12 text-center border-dashed">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-accent shadow-glow">
          <Construction className="h-7 w-7 text-accent-foreground" />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold">Coming in the next phase</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          This module is part of an upcoming build phase. The foundation, routing, and access control are already in place.
        </p>
      </Card>
    </div>
  );
}

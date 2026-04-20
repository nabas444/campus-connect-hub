import { GraduationCap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container-page flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-display font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-accent">
            <GraduationCap className="h-4 w-4 text-accent-foreground" />
          </span>
          Campus
        </div>
        <p>© {new Date().getFullYear()} Campus. Built for students.</p>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 sm:p-16 text-center text-primary-foreground shadow-elegant">
          <div className="absolute inset-0 bg-gradient-glow opacity-60" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">
              Ready to give your campus a tech edge?
            </h2>
            <p className="mt-4 text-lg opacity-90 max-w-2xl mx-auto">
              Join students and experts already using Campus to ship work faster and resolve issues sooner.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/auth?mode=signup">
                  Create your account <ArrowRight className="ml-1" />
                </Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

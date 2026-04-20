import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-glow" aria-hidden />

      <div className="container-page relative pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI-powered support for every student
          </div>

          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Tech & academic help,
            <br />
            <span className="text-gradient">all in one place.</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
            Submit a ticket, get matched with a verified expert, chat in real-time, and track progress —
            from broken laptops to looming deadlines.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild variant="hero" size="xl">
              <Link to="/auth?mode=signup">
                Start free <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <a href="#features">See how it works</a>
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Free for students · No credit card required
          </p>
        </div>

        {/* Floating preview card */}
        <div className="mt-16 sm:mt-20 mx-auto max-w-5xl animate-float">
          <div className="relative rounded-2xl border border-border bg-card/80 p-2 shadow-elegant backdrop-blur-xl">
            <div className="absolute -inset-px rounded-2xl bg-gradient-accent opacity-20 blur-xl" aria-hidden />
            <div className="relative rounded-xl bg-gradient-hero p-8 sm:p-12 text-primary-foreground">
              <div className="grid sm:grid-cols-3 gap-6 text-left">
                {[
                  { label: "Active tickets", value: "12" },
                  { label: "Avg. response", value: "8m" },
                  { label: "Satisfaction", value: "98%" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="font-display text-4xl font-bold">{s.value}</div>
                    <div className="mt-1 text-sm opacity-80">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

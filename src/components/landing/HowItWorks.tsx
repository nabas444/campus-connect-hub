const steps = [
  { n: "01", title: "Submit your request", desc: "Describe your tech issue or academic task. Add files, set priority, choose a deadline." },
  { n: "02", title: "Get matched with an expert", desc: "Our system routes you to the best-fit technician or tutor based on skill and rating." },
  { n: "03", title: "Collaborate in real-time", desc: "Chat, share files, and track milestones until your problem is solved or your project is delivered." },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-24 sm:py-32 bg-muted/40 border-y border-border/60">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">From stuck to solved in 3 steps</h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="font-display text-5xl font-bold text-gradient">{s.n}</div>
              <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Wrench, BookOpen, MessagesSquare, ShieldCheck, BarChart3, Sparkles } from "lucide-react";

const features = [
  {
    icon: Wrench,
    title: "Tech support tickets",
    desc: "Hardware, software, network — submit with attachments, set priority, get matched with the right technician.",
  },
  {
    icon: BookOpen,
    title: "Academic assistance",
    desc: "Assignments and projects with milestone tracking, file versioning, and on-time delivery.",
  },
  {
    icon: MessagesSquare,
    title: "Real-time chat",
    desc: "Talk directly with your expert. Share files, get typing indicators, and keep full message history.",
  },
  {
    icon: Sparkles,
    title: "AI diagnosis",
    desc: "Smart suggestions before you submit, chat summarization, and deadline-risk prediction.",
  },
  {
    icon: BarChart3,
    title: "Progress analytics",
    desc: "Personal productivity insights, expert performance scores, and admin-grade dashboards.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & verified",
    desc: "Role-based access, encrypted sessions, and reviewed experts. Built on production-grade infrastructure.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Platform</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            Everything your campus needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One workspace for tech support, academic help, and the operations that keep them running.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-accent shadow-glow transition-transform group-hover:scale-110">
                <f.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

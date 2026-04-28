type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: string;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-emerald-950/10 bg-white shadow-sm shadow-emerald-950/5">
      <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-400" />
      <div className="p-5 lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-emerald-700">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-emerald-950">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
        </div>
        {action ? (
          <button
            type="button"
            className="h-11 rounded-md border border-emerald-700 bg-emerald-700 px-4 text-sm font-black text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-800"
          >
            {action}
          </button>
        ) : null}
      </div>
      </div>
    </section>
  );
}

type Metric = {
  label: string;
  value: string;
  note: string;
};

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="mt-5 grid gap-3 md:grid-cols-3">
      {metrics.map((metric, index) => (
        <div
          className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5"
          key={metric.label}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-black uppercase text-stone-500">{metric.label}</p>
            <span className={`h-2.5 w-2.5 rounded-full ${index === 1 ? "bg-amber-400" : "bg-emerald-500"}`} />
          </div>
          <p className="mt-3 text-3xl font-black tracking-tight text-emerald-950">{metric.value}</p>
          <p className="mt-2 text-sm font-semibold text-stone-600">{metric.note}</p>
        </div>
      ))}
    </section>
  );
}

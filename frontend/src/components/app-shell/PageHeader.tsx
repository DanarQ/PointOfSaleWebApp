type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: string;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <section className="border border-neutral-200 bg-white p-5 shadow-sm lg:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-neutral-500">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">{description}</p>
        </div>
        {action ? (
          <button
            type="button"
            className="h-11 border border-neutral-950 bg-neutral-950 px-4 text-sm font-black text-white transition hover:bg-neutral-800"
          >
            {action}
          </button>
        ) : null}
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
    <section className="mt-5 grid gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
        <div className="border border-neutral-200 bg-white p-5 shadow-sm" key={metric.label}>
          <p className="text-xs font-black uppercase text-neutral-500">{metric.label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{metric.value}</p>
          <p className="mt-2 text-sm text-neutral-600">{metric.note}</p>
        </div>
      ))}
    </section>
  );
}

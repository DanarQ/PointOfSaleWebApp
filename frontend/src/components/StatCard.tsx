type StatCardProps = {
  label: string;
  tone?: "mint" | "amber" | "ink";
  trend?: string;
  value: string;
};

function StatCard({ label, tone = "ink", trend, value }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <p className="stat-card__label">{label}</p>
      <strong className="stat-card__value">{value}</strong>
      {trend ? <span className="stat-card__trend">{trend}</span> : null}
    </article>
  );
}

export default StatCard;

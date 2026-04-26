import type { ReactNode } from "react";

type CardProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
};

function Card({ actions, children, className = "", eyebrow, title }: CardProps) {
  return (
    <section className={`card ${className}`}>
      {(eyebrow || title || actions) && (
        <div className="card__header">
          <div>
            {eyebrow ? <p className="card__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="card__title">{title}</h2> : null}
          </div>
          {actions ? <div className="card__actions">{actions}</div> : null}
        </div>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}

export default Card;

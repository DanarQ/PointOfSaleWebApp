import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: ActionButtonVariant;
};

function ActionButton({
  children,
  className = "",
  icon,
  type = "button",
  variant = "primary",
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={`action-button action-button--${variant} ${className}`}
      type={type}
      {...props}
    >
      {icon ? <span className="action-button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

export default ActionButton;

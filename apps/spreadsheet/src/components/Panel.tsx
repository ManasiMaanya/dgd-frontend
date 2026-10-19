import type { HTMLAttributes, ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  soft?: boolean;
}

export function Panel({ children, soft = false, className = "", ...rest }: PanelProps) {
  return (
    <section className={`panel${soft ? " panel--soft" : ""}${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </section>
  );
}

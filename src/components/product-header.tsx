import { type ReactNode } from "react";

export function ProductHeader({
  title,
  description,
  titleId,
}: {
  title: ReactNode;
  description: ReactNode;
  titleId?: string;
}) {
  return (
    <header className="product-header">
      <h1 id={titleId}>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

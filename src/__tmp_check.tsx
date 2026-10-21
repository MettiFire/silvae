import { lazy } from "react";
import { createRootRouteWithContext, type ErrorComponentProps } from "@tanstack/react-router";

function V({ error, reset }: ErrorComponentProps) {
  console.error(error, reset);
  return null;
}

const A = lazy(() => Promise.resolve({ default: V }));
const B = Object.assign(V, { preload: () => Promise.resolve() });

export const RA = createRootRouteWithContext()({ errorComponent: A });
export const RB = createRootRouteWithContext()({ errorComponent: B });

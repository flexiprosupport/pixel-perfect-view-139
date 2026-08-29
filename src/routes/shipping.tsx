import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/shipping")({
  beforeLoad: () => {
    throw redirect({ to: "/delivery" });
  },
});

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = (
  ...[error, request, context]: Parameters<
    NonNullable<typeof import("next/types")["default"]>
  > extends never
    ? [Error, { path: string; method: string }, { routerKind: string; routePath: string }]
    : [Error, { path: string; method: string }, { routerKind: string; routePath: string }]
) => {
  // This captures server-side rendering errors in Sentry
  const Sentry = require("@sentry/nextjs");
  Sentry.captureException(error, {
    extra: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
    },
  });
};

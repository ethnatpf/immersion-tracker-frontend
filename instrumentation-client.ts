import {
  ErrorsInstrumentation,
  FetchTransport,
  initializeFaro,
  WebVitalsInstrumentation,
} from "@grafana/faro-web-sdk";
import { normalizeRoute } from "@/lib/observability/normalize-route";

export const faro = initializeFaro({
  app: {
    name: "immersion-tracker-frontend",
  },

  instrumentations: [
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
  ],
  transports: [
    new FetchTransport({ url: "/api/backend/observability/faro/collect" }),
  ],
});

export function setFaroRoute(route: string) {
  faro.api.setView({ name: normalizeRoute(route) });
}

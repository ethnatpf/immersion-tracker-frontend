import {
  ErrorsInstrumentation,
  FetchTransport,
  initializeFaro,
  WebVitalsInstrumentation,
} from "@grafana/faro-web-sdk";

initializeFaro({
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

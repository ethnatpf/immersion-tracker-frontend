import { loadEnvConfig } from "@next/env";
import { defineConfig } from "orval";

loadEnvConfig(process.cwd());

export default defineConfig({
  immersion: {
    input: process.env.OPENAPI_URL ?? "http://localhost:4000/api-json",
    output: {
      target: "./lib/api/generated/immersion.ts",
      schemas: "./lib/api/generated/models",
      client: "react-query",
      httpClient: "fetch",
      mode: "single",
      clean: true,
      baseUrl: { runtime: "process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'" },
      mock: { generators: [{ type: "msw", delay: false }] },
      override: {
        mutator: { path: "./lib/api/fetch.ts", name: "apiFetch" },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
});

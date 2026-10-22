import { setupServer } from "msw/node";

// Tests opt into the generated handlers they need, with explicit response fixtures.
export const server = setupServer();

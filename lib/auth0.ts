import { Auth0Client } from "@auth0/nextjs-auth0/server";

// The SDK reads AUTH0_* and APP_BASE_URL from the server environment.
export const auth0 = new Auth0Client({
  enableAccessTokenEndpoint: false,
});

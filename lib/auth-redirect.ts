let redirectStarted = false;

export function signInUrl(origin: string, pathname: string, search: string) {
  const loginUrl = new URL("/auth/login", origin);
  loginUrl.searchParams.set("returnTo", pathname + search);
  return loginUrl.toString();
}

export function redirectToSignIn() {
  if (
    typeof window === "undefined" ||
    redirectStarted ||
    window.location.pathname === "/auth/login"
  ) {
    return;
  }

  redirectStarted = true;
  window.location.assign(
    signInUrl(
      window.location.origin,
      window.location.pathname,
      window.location.search,
    ),
  );
}

/**
 * Convex authentication configuration for Clerk.
 *
 * Tells Convex how to validate JWTs issued by Clerk.
 * The `domain` value must match your Clerk Frontend API URL.
 *
 * @see https://docs.convex.dev/auth/clerk
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};

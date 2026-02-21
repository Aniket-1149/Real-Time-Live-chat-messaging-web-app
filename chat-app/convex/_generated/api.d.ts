/* eslint-disable */
/**
 * AUTO-GENERATED FILE — do not edit.
 * Run `npx convex dev` to regenerate after schema changes.
 *
 * This stub satisfies TypeScript before the first `npx convex dev` run.
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as conversations from "../conversations.js";
import type * as helpers from "../helpers.js";
import type * as messages from "../messages.js";
import type * as typing from "../typing.js";
import type * as users from "../users.js";

type Mounts = {
  conversations: typeof conversations;
  helpers: typeof helpers;
  messages: typeof messages;
  typing: typeof typing;
  users: typeof users;
};

// Flatten API shape
export type API = ApiFromModules<Mounts>;

export declare const api: FilterApi<
  typeof anyApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof anyApi,
  FunctionReference<any, "internal">
>;

declare const anyApi: API;

/* eslint-disable */
/**
 * AUTO-GENERATED FILE — do not edit.
 * Run `npx convex dev` to regenerate.
 *
 * This stub exposes the QueryCtx, MutationCtx, query, and mutation
 * helpers used in the Convex backend functions.
 */

export type QueryCtx = {
  db: {
    get: (id: any) => Promise<any>;
    query: (tableName: string) => any;
    insert: (tableName: string, document: any) => Promise<any>;
    patch: (id: any, fields: any) => Promise<void>;
    delete: (id: any) => Promise<void>;
  };
  auth: {
    getUserIdentity: () => Promise<{
      subject: string;
      email?: string;
      name?: string;
      pictureUrl?: string;
    } | null>;
  };
  storage: any;
};

export type MutationCtx = QueryCtx & {
  scheduler: any;
};

export type ActionCtx = {
  auth: QueryCtx["auth"];
  scheduler: any;
  runQuery: (fn: any, args?: any) => Promise<any>;
  runMutation: (fn: any, args?: any) => Promise<any>;
  runAction: (fn: any, args?: any) => Promise<any>;
};

export declare function query(config: {
  args?: any;
  handler: (ctx: QueryCtx, args: any) => Promise<any> | any;
}): any;

export declare function mutation(config: {
  args?: any;
  handler: (ctx: MutationCtx, args: any) => Promise<any> | any;
}): any;

export declare function action(config: {
  args?: any;
  handler: (ctx: ActionCtx, args: any) => Promise<any> | any;
}): any;

export declare function internalQuery(config: {
  args?: any;
  handler: (ctx: QueryCtx, args: any) => Promise<any> | any;
}): any;

export declare function internalMutation(config: {
  args?: any;
  handler: (ctx: MutationCtx, args: any) => Promise<any> | any;
}): any;

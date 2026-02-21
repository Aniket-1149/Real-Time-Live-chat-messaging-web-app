/* eslint-disable */
/**
 * AUTO-GENERATED FILE — do not edit.
 * Run `npx convex dev` to regenerate.
 *
 * This stub satisfies TypeScript for Id<"tableName"> references before
 * the first `npx convex dev` run.
 */

/**
 * Generic branded ID type — after `npx convex dev` this becomes fully typed.
 * @template TableName - The name of the Convex table
 */
export type Id<TableName extends string> = string & { __tableName: TableName };

export type DataModel = {
  users: {
    document: {
      _id: Id<"users">;
      _creationTime: number;
      clerkId: string;
      name: string;
      email: string;
      imageUrl: string;
      status: string;
      lastSeenAt: number;
    };
    fieldPaths: "_id" | "_creationTime" | "clerkId" | "name" | "email" | "imageUrl" | "status" | "lastSeenAt";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };
  conversations: {
    document: {
      _id: Id<"conversations">;
      _creationTime: number;
      participantIds: Id<"users">[];
      lastMessageId?: Id<"messages">;
      lastMessageText?: string;
      lastMessageTime?: number;
    };
    fieldPaths: "_id" | "_creationTime" | "participantIds" | "lastMessageId" | "lastMessageText" | "lastMessageTime";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };
  conversationMembers: {
    document: {
      _id: Id<"conversationMembers">;
      _creationTime: number;
      conversationId: Id<"conversations">;
      userId: Id<"users">;
      unreadCount: number;
    };
    fieldPaths: "_id" | "_creationTime" | "conversationId" | "userId" | "unreadCount";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };
  messages: {
    document: {
      _id: Id<"messages">;
      _creationTime: number;
      conversationId: Id<"conversations">;
      senderId: Id<"users">;
      text: string;
      reactions?: { emoji: string; userIds: Id<"users">[] }[];
      deleted?: boolean;
    };
    fieldPaths: "_id" | "_creationTime" | "conversationId" | "senderId" | "text" | "reactions" | "deleted";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };
  typingIndicators: {
    document: {
      _id: Id<"typingIndicators">;
      _creationTime: number;
      conversationId: Id<"conversations">;
      userId: Id<"users">;
      updatedAt: number;
    };
    fieldPaths: "_id" | "_creationTime" | "conversationId" | "userId" | "updatedAt";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };
};

export type TableNames = keyof DataModel;

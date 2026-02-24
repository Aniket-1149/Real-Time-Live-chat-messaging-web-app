/* eslint-disable */
/**
 * AUTO-GENERATED FILE — do not edit manually.
 * Run `npx convex dev` to regenerate from schema.ts.
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
  // ─── users ──────────────────────────────────────────────────────────────
  users: {
    document: {
      _id: Id<"users">;
      _creationTime: number;
      clerkId: string;
      name: string;
      email: string;
      imageUrl: string;
      displayName?: string;
    };
    fieldPaths:
      | "_id" | "_creationTime" | "clerkId" | "name"
      | "email" | "imageUrl" | "displayName";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };

  // ─── presence ────────────────────────────────────────────────────────────
  presence: {
    document: {
      _id: Id<"presence">;
      _creationTime: number;
      userId: Id<"users">;
      status: string;
      lastSeenAt: number;
    };
    fieldPaths: "_id" | "_creationTime" | "userId" | "status" | "lastSeenAt";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };

  // ─── conversations ────────────────────────────────────────────────────────
  conversations: {
    document: {
      _id: Id<"conversations">;
      _creationTime: number;
      type: "dm" | "group";
      participantIds: Id<"users">[];
      name?: string;
      imageUrl?: string;
      createdBy?: Id<"users">;
      lastMessageId?: Id<"messages">;
      lastMessageText?: string;
      lastMessageTime?: number;
      lastMessageSenderId?: Id<"users">;
    };
    fieldPaths:
      | "_id" | "_creationTime" | "type" | "participantIds"
      | "name" | "imageUrl" | "createdBy"
      | "lastMessageId" | "lastMessageText" | "lastMessageTime" | "lastMessageSenderId";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };

  // ─── conversationMembers ─────────────────────────────────────────────────
  conversationMembers: {
    document: {
      _id: Id<"conversationMembers">;
      _creationTime: number;
      conversationId: Id<"conversations">;
      userId: Id<"users">;
      unreadCount: number;
      lastReadMessageId?: Id<"messages">;
      lastReadAt?: number;
      role?: "member" | "admin";
      joinedAt: number;
    };
    fieldPaths:
      | "_id" | "_creationTime" | "conversationId" | "userId"
      | "unreadCount" | "lastReadMessageId" | "lastReadAt" | "role" | "joinedAt";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };

  // ─── messages ─────────────────────────────────────────────────────────────
  messages: {
    document: {
      _id: Id<"messages">;
      _creationTime: number;
      conversationId: Id<"conversations">;
      senderId: Id<"users">;
      text: string;
      /** Explicit send timestamp (Unix ms) — always present for new rows */
      sentAt: number;
      replyToId?: Id<"messages">;
      deleted: boolean;
      deletedAt?: number;
      edited?: boolean;
      editedAt?: number;
    };
    fieldPaths:
      | "_id" | "_creationTime" | "conversationId" | "senderId" | "text"
      | "sentAt" | "replyToId" | "deleted" | "deletedAt" | "edited" | "editedAt";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };

  // ─── reactions ────────────────────────────────────────────────────────────
  reactions: {
    document: {
      _id: Id<"reactions">;
      _creationTime: number;
      messageId: Id<"messages">;
      userId: Id<"users">;
      emoji: string;
      createdAt: number;
    };
    fieldPaths:
      | "_id" | "_creationTime" | "messageId" | "userId" | "emoji" | "createdAt";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };

  // ─── typing ───────────────────────────────────────────────────────────────
  typing: {
    document: {
      _id: Id<"typing">;
      _creationTime: number;
      conversationId: Id<"conversations">;
      userId: Id<"users">;
      updatedAt: number;
    };
    fieldPaths:
      | "_id" | "_creationTime" | "conversationId" | "userId" | "updatedAt";
    indexes: {};
    searchIndexes: {};
    vectorIndexes: {};
  };
};

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

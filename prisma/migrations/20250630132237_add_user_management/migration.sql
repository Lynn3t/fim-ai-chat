-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "username" TEXT,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canShareAccessCode" BOOLEAN NOT NULL DEFAULT true,
    "invitedBy" TEXT,
    "usedInviteCode" TEXT,
    "usedAccessCode" TEXT,
    "hostUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("avatar", "createdAt", "email", "hostUserId", "id", "invitedBy", "isActive", "role", "updatedAt", "usedAccessCode", "usedInviteCode", "username") SELECT "avatar", "createdAt", "email", "hostUserId", "id", "invitedBy", "isActive", "role", "updatedAt", "usedAccessCode", "usedInviteCode", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Create Factory table and seed default factories
CREATE TABLE "Factory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Factory_code_key" ON "Factory"("code");

INSERT INTO "Factory" ("id", "code", "name") VALUES (1, 'factory-1', 'Sunrise Textiles');
INSERT INTO "Factory" ("id", "code", "name") VALUES (2, 'factory-2', 'Green Valley Manufacturing');

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Admin: attach existing admins to Factory 1
CREATE TABLE "new_Admin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admin_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Admin" ("createdAt", "email", "id", "name", "password", "factoryId")
SELECT "createdAt", "email", "id", "name", "password", 1 FROM "Admin";

DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- Employee: attach existing employees to Factory 1
CREATE TABLE "new_Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "factoryId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "phone" TEXT,
    "photoPath" TEXT,
    "faceEmbedding" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employee_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Employee" (
    "createdAt", "department", "employeeId", "faceEmbedding", "id", "name", "phone", "photoPath", "factoryId"
)
SELECT
    "createdAt", "department", "employeeId", "faceEmbedding", "id", "name", "phone", "photoPath", 1
FROM "Employee";

DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_factoryId_employeeId_key" ON "Employee"("factoryId", "employeeId");

-- Settings: attach existing settings to Factory 1
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "factoryId" INTEGER NOT NULL,
    "factoryName" TEXT NOT NULL DEFAULT 'Factory Attendance',
    "shiftStart" TEXT NOT NULL DEFAULT '09:00',
    "shiftEnd" TEXT NOT NULL DEFAULT '18:00',
    "lateAfter" TEXT NOT NULL DEFAULT '09:15',
    "minFaceConfidence" INTEGER NOT NULL DEFAULT 65,
    CONSTRAINT "Settings_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Settings" (
    "factoryName", "id", "lateAfter", "minFaceConfidence", "shiftEnd", "shiftStart", "factoryId"
)
SELECT
    "factoryName", "id", "lateAfter", "minFaceConfidence", "shiftEnd", "shiftStart", 1
FROM "Settings";

DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_factoryId_key" ON "Settings"("factoryId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

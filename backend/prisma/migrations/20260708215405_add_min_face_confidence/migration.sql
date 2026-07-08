-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "factoryName" TEXT NOT NULL DEFAULT 'Factory Attendance',
    "shiftStart" TEXT NOT NULL DEFAULT '09:00',
    "shiftEnd" TEXT NOT NULL DEFAULT '18:00',
    "lateAfter" TEXT NOT NULL DEFAULT '09:15',
    "minFaceConfidence" INTEGER NOT NULL DEFAULT 70
);
INSERT INTO "new_Settings" ("factoryName", "id", "lateAfter", "shiftEnd", "shiftStart") SELECT "factoryName", "id", "lateAfter", "shiftEnd", "shiftStart" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

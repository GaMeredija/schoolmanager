const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const repoRoot = path.resolve(__dirname, "..", "..");
const persistentRoot =
  process.env.RENDER_DISK_MOUNT_PATH ||
  process.env.PERSISTENT_DATA_PATH ||
  path.join(repoRoot, ".render-data");
const persistentDbDir = path.join(persistentRoot, "db");
const persistentDbPath = path.join(persistentDbDir, "school.db");
const templateDbPath = path.join(
  repoRoot,
  "scripts",
  "database",
  "bootstrap",
  "school.seed.sqlite3",
);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) return;

  const stat = fs.lstatSync(targetPath);
  if (stat.isSymbolicLink() || stat.isFile()) {
    fs.unlinkSync(targetPath);
    return;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
}

function linkOrCopy(sourcePath, targetPath, type) {
  ensureDir(path.dirname(targetPath));
  removeIfExists(targetPath);

  try {
    const symlinkType =
      process.platform === "win32"
        ? type === "dir"
          ? "junction"
          : "file"
        : type;
    fs.symlinkSync(sourcePath, targetPath, symlinkType);
  } catch (error) {
    if (type === "file") {
      fs.copyFileSync(sourcePath, targetPath);
      return;
    }

    ensureDir(targetPath);
  }
}

function hasColumn(db, tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some(
    (column) => String(column.name).toLowerCase() === columnName.toLowerCase(),
  );
}

function ensureColumn(db, tableName, columnName, sqlType) {
  if (!hasColumn(db, tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlType}`);
  }
}

function preparePersistentDb() {
  if (!fs.existsSync(templateDbPath)) {
    throw new Error(`Template do banco não encontrado em ${templateDbPath}`);
  }

  ensureDir(persistentDbDir);

  if (!fs.existsSync(persistentDbPath)) {
    fs.copyFileSync(templateDbPath, persistentDbPath);
    console.log(`Banco inicial criado em ${persistentDbPath}`);
  } else {
    console.log(`Banco persistente existente mantido em ${persistentDbPath}`);
  }

  const db = new Database(persistentDbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS classSchedule (
      id TEXT PRIMARY KEY NOT NULL,
      classId TEXT NOT NULL,
      day TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      subjectId TEXT,
      teacherId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  ensureColumn(db, "users", "birthDate", "TEXT");
  ensureColumn(db, "events", "isGlobal", "INTEGER DEFAULT 0");
  ensureColumn(db, "notifications", "userId", "TEXT");
  ensureColumn(db, "notifications", "data", "TEXT");
  ensureColumn(db, "systemLogs", "locationCity", "TEXT");
  ensureColumn(db, "systemLogs", "locationRegion", "TEXT");
  ensureColumn(db, "systemLogs", "locationCountry", "TEXT");
  ensureColumn(db, "systemLogs", "latitude", "REAL");
  ensureColumn(db, "systemLogs", "longitude", "REAL");
  ensureColumn(db, "systemLogs", "timezone", "TEXT");
  ensureColumn(db, "systemLogs", "deviceType", "TEXT");
  ensureColumn(db, "systemLogs", "os", "TEXT");
  ensureColumn(db, "systemLogs", "osVersion", "TEXT");
  ensureColumn(db, "systemLogs", "browser", "TEXT");
  ensureColumn(db, "systemLogs", "browserVersion", "TEXT");

  db.close();
}

function exposePersistentPaths() {
  const rootDbPath = path.join(repoRoot, "school.db");
  const serverDbPath = path.join(repoRoot, "server", "school.db");
  const distDbPath = path.join(repoRoot, "dist", "school.db");

  const persistentUploadsPath = path.join(persistentRoot, "uploads");
  const persistentLogsPath = path.join(persistentRoot, "logs");
  const persistentServerLogsPath = path.join(persistentRoot, "server-logs");

  ensureDir(persistentUploadsPath);
  ensureDir(persistentLogsPath);
  ensureDir(persistentServerLogsPath);

  linkOrCopy(persistentDbPath, rootDbPath, "file");
  linkOrCopy(persistentDbPath, serverDbPath, "file");

  if (fs.existsSync(path.join(repoRoot, "dist"))) {
    linkOrCopy(persistentDbPath, distDbPath, "file");
  }

  linkOrCopy(persistentUploadsPath, path.join(repoRoot, "uploads"), "dir");
  linkOrCopy(persistentLogsPath, path.join(repoRoot, "logs"), "dir");
  linkOrCopy(
    persistentServerLogsPath,
    path.join(repoRoot, "server", "logs"),
    "dir",
  );
}

preparePersistentDb();
exposePersistentPaths();

console.log(`Render runtime preparado em ${persistentRoot}`);

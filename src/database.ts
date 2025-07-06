import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";
import { BusinessCard } from "./types";

let db: Database;

async function initDb(): Promise<void> {
  db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

  // Create table with old schema first if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS BusinessCards (
      world_id_hash TEXT PRIMARY KEY,
      telegram_id INTEGER UNIQUE NOT NULL,
      telegram_username TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      bio TEXT NOT NULL,
      linkedin_url TEXT
    );
  `);

  // Check if we need to migrate the schema
  const tableInfo = await db.all("PRAGMA table_info(BusinessCards)");
  const hasIsVerified = tableInfo.some((col: any) => col.name === 'is_verified');
  const hasTelegramIdAsPrimary = tableInfo.some((col: any) => col.name === 'telegram_id' && col.pk === 1);

  if (!hasIsVerified || !hasTelegramIdAsPrimary) {
    console.log("Migrating database schema...");
    
    // Create new table with updated schema
    await db.exec(`
      CREATE TABLE IF NOT EXISTS BusinessCards_new (
        telegram_id INTEGER PRIMARY KEY,
        world_id_hash TEXT UNIQUE,
        telegram_username TEXT NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        bio TEXT NOT NULL,
        linkedin_url TEXT,
        is_verified BOOLEAN DEFAULT FALSE
      );
    `);

    // Migrate existing data
    await db.exec(`
      INSERT OR IGNORE INTO BusinessCards_new
      (telegram_id, world_id_hash, telegram_username, name, title, bio, linkedin_url, is_verified)
      SELECT telegram_id, world_id_hash, telegram_username, name, title, bio, linkedin_url,
             CASE WHEN world_id_hash IS NOT NULL AND world_id_hash != '' THEN 1 ELSE 0 END
      FROM BusinessCards;
    `);

    // Replace old table with new one
    await db.exec(`DROP TABLE BusinessCards;`);
    await db.exec(`ALTER TABLE BusinessCards_new RENAME TO BusinessCards;`);
    
    console.log("Database migration completed.");
  }

  console.log("Database initialized.");
}

async function findUserByTelegramId(
  id: number,
): Promise<BusinessCard | undefined> {
  return db.get<BusinessCard>(
    "SELECT * FROM BusinessCards WHERE telegram_id = ?",
    id,
  );
}

async function findUserByUsername(
  username: string,
): Promise<BusinessCard | undefined> {
  const cleanUsername = username.startsWith("@")
    ? username.substring(1)
    : username;
  return db.get<BusinessCard>(
    "SELECT * FROM BusinessCards WHERE telegram_username = ?",
    cleanUsername,
  );
}

async function searchUsersByName(nameQuery: string): Promise<BusinessCard[]> {
  return db.all<BusinessCard[]>(
    "SELECT * FROM BusinessCards WHERE name LIKE ? LIMIT 10",
    `%${nameQuery}%`,
  );
}

async function createVerifiedUser(
  telegram_id: number,
  telegram_username: string,
  world_id_hash: string,
): Promise<void> {
  const placeholder = {
    name: "Unnamed",
    title: "Untitled",
    bio: "No bio yet. Use /createcard to set up your profile!",
  };
  await db.run(
    "INSERT OR REPLACE INTO BusinessCards (telegram_id, world_id_hash, telegram_username, name, title, bio, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)",
    telegram_id,
    world_id_hash,
    telegram_username,
    placeholder.name,
    placeholder.title,
    placeholder.bio,
    true,
  );
}

async function createUnverifiedUser(
  telegram_id: number,
  telegram_username: string,
): Promise<void> {
  const placeholder = {
    name: "Unnamed",
    title: "Untitled",
    bio: "No bio yet. Use /createcard to set up your profile!",
  };
  await db.run(
    "INSERT OR IGNORE INTO BusinessCards (telegram_id, telegram_username, name, title, bio, is_verified) VALUES (?, ?, ?, ?, ?, ?)",
    telegram_id,
    telegram_username,
    placeholder.name,
    placeholder.title,
    placeholder.bio,
    false,
  );
}

async function updateUserCard(
  telegram_id: number,
  updates: Partial<Omit<BusinessCard, "telegram_id" | "world_id_hash">>,
): Promise<void> {
  const setParts = [];
  const values = [];
  
  if (updates.name !== undefined) {
    setParts.push("name = ?");
    values.push(updates.name);
  }
  if (updates.title !== undefined) {
    setParts.push("title = ?");
    values.push(updates.title);
  }
  if (updates.bio !== undefined) {
    setParts.push("bio = ?");
    values.push(updates.bio);
  }
  if (updates.linkedin_url !== undefined) {
    setParts.push("linkedin_url = ?");
    values.push(updates.linkedin_url);
  }
  
  if (setParts.length === 0) {
    return; // No updates to make
  }
  
  values.push(telegram_id);
  
  await db.run(
    `UPDATE BusinessCards SET ${setParts.join(", ")} WHERE telegram_id = ?`,
    ...values,
  );
}

async function deleteUser(telegram_id: number): Promise<void> {
  await db.run("DELETE FROM BusinessCards WHERE telegram_id = ?", telegram_id);
}

module.exports = {
  initDb,
  findUserByTelegramId,
  findUserByUsername,
  searchUsersByName,
  createVerifiedUser,
  createUnverifiedUser,
  updateUserCard,
  deleteUser,
};

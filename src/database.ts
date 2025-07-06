import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";
import { BusinessCard } from "./types";

let db: Database;

async function initDb(): Promise<void> {
  db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

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
    "INSERT OR IGNORE INTO BusinessCards (world_id_hash, telegram_id, telegram_username, name, title, bio) VALUES (?, ?, ?, ?, ?, ?)",
    world_id_hash,
    telegram_id,
    telegram_username,
    placeholder.name,
    placeholder.title,
    placeholder.bio,
  );
}

async function updateUserCard(
  telegram_id: number,
  updates: Partial<Omit<BusinessCard, "telegram_id" | "world_id_hash">>,
): Promise<void> {
  await db.run(
    "UPDATE BusinessCards SET name = ?, title = ?, bio = ?, linkedin_url = ? WHERE telegram_id = ?",
    updates.name,
    updates.title,
    updates.bio,
    updates.linkedin_url,
    telegram_id,
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
  updateUserCard,
  deleteUser,
};

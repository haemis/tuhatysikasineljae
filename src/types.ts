// src/types.ts

export interface BusinessCard {
  world_id_hash: string;
  telegram_id: number;
  telegram_username: string;
  name: string;
  title: string;
  bio: string;
  linkedin_url?: string; // Optional
}

Of course. Here is a simplified version of the Product Requirements Document, stripped down to the essentials for a quick Proof of Concept (PoC) or Minimum Viable Product (MVP) suitable for a hackathon.

The focus is on the single, core user journey: **Verify with World ID -> Create a Card -> Be discoverable.**

---

### **MVP Spec: Telegram World ID Business Card Bot**

**1. The 1-Liner Concept**

A Telegram bot where users prove they are a unique human with World ID to create a simple, searchable digital business card.

**2. Core User Flow (The "Golden Path")**

1.  **Start & Verify:** A new user starts the bot. They are prompted to verify with World ID. They cannot proceed until they do.
2.  **Create Card:** Once verified, they use a single command to create/edit their business card with basic info.
3.  **Search:** The user can now search for other verified users by name.
4.  **View:** The user can view the simple business card of anyone found via search.

**3. Key Features (Commands)**

| Command | Description | KISS Implementation Notes |
| :--- | :--- | :--- |
| `/start` | Welcomes the user. Checks if they are verified with World ID. If not, it prompts them to `/verify`. If they are, it shows the main menu. | Simple text response with inline buttons for other commands. |
| `/verify` | **(MANDATORY FIRST STEP)** Initiates the World ID verification process. | Use the World ID JS widget URL. Bot stores the returned `proof` and `merkle_root`. A user cannot use other commands before this. |
| `/createcard` | A guided process to create or update the user's business card. | The bot asks for each field one by one: `Name`, `Title`, `Bio`, and `LinkedIn URL (optional)`. That's it. |
| `/mycard` | Displays the user's own business card as it appears to others. | Simple, formatted text message. |
| `/search <name>` | Searches for other users by name. | Simple `LIKE '%name%'` query on the `Name` field. No fuzzy search, no multiple criteria. Returns a list of matching names. |
| `/view <telegram_username>` | Displays the public card of a specific user. | Bot fetches and displays the card for the given username. |
| `/deletecard` | Deletes the user's card and all their data. | A simple way to "opt-out". Confirms once before deleting. |

**4. Simplified Data Model**

Use a single database table. SQLite is perfect for a hackathon.

**Table: `BusinessCards`**
*   `world_id_hash` (Primary Key, TEXT): The unique identifier from World ID. This is the source of truth for uniqueness.
*   `telegram_id` (INTEGER): The user's Telegram ID.
*   `telegram_username` (TEXT): The user's Telegram @username.
*   `name` (TEXT)
*   `title` (TEXT)
*   `bio` (TEXT)
*   `linkedin_url` (TEXT, nullable)

**5. Tech Stack (PoC Recommendations)**

*   **Language:** Python (`python-telegram-bot`) or Node.js (`telegraf.js`).
*   **Database:** **SQLite**. It's a single file, no server needed. Perfect for a PoC.
*   **Hosting:** Run locally with `ngrok` for the demo, or a free tier on Heroku/Fly.io.

**6. What's "Out of Scope" for the MVP**

*   **Complex Connections:** No `/connect`, `/accept`, `/decline` flows. If you have a card, you're in the public directory. Networking is implicit.
*   **Advanced Search:** No searching by title, bio, or mutual connections. Just by name.
*   **Privacy Settings:** All profiles are public by default. The only privacy is deleting your card.
*   **Profile Analytics:** No view counters or metrics.
*   **Extensive Profile Fields:** No GitHub, website, etc. Keep the card simple.
*   **Scalability/Performance:** Don't worry about 10,000 users. Make it work for 10.
*   **Error Handling:** Basic error messages are fine. No need for graceful degradation.
# UWS Discord — Community Management Bot

A Node.js + TypeScript + discord.js bot that configures and runs a Discord
community server: categories/channels/roles via an idempotent, dry-run-first
setup script, plus onboarding, verification, self-assignable roles,
moderation, spam/link automod, a ticket system, and announcements.

## 1. Prerequisites

- Node.js 22.5+ (uses the built-in `node:sqlite` module — no native compiler toolchain required for the database)
- A Discord server (guild) you own or administrate
- A Discord Application + Bot at https://discord.com/developers/applications

## 2. Create and invite the bot

1. Go to the [Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → **Reset Token** → copy it (this is `DISCORD_TOKEN`). Never commit this anywhere.
3. On the same **Bot** tab, enable these **Privileged Gateway Intents**:
   - **Server Members Intent** (required for onboarding / role assignment on join)
   - **Message Content Intent** (required for spam/link automod)
4. **General Information** tab → copy the **Application ID** (this is `DISCORD_CLIENT_ID`).
5. **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: easiest is **Administrator** for the initial setup run (the setup script needs to create/edit
     roles and channels, including ones above most others in the hierarchy). If you'd rather scope it down, grant at
     least: Manage Roles, Manage Channels, Kick Members, Ban Members, Moderate Members, Manage Messages, Manage
     Nicknames, Manage Webhooks, View Audit Log, Send Messages, Embed Links, Attach Files, Add Reactions, Read
     Message History, Use Application Commands.
   - Open the generated URL and invite the bot to your server.
6. **Important — role position**: right after inviting, open **Server Settings → Roles** and drag the bot's own role
   near the top (above where "Moderator" will end up). The setup script will try to do this automatically on
   `--apply`, but it can only move roles if its own role already outranks them, so the very first time may need a
   manual nudge.

Right-click your server icon → **Copy Server ID** (Developer Mode must be on in Discord settings) for `DISCORD_GUILD_ID`.

## 3. Install & configure

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-application-id
DISCORD_GUILD_ID=your-server-id
```

`.env` is gitignored — never commit it. `.env.example` has no real values and is safe to commit.

## 4. Configure the server (dry-run first!)

The entire category/channel/role structure lives in `src/config/blueprint.ts` as data, not hardcoded API calls. The
setup script reads your live server, diffs it against the blueprint, and reports a plan.

```bash
npm run setup          # DRY RUN — prints the plan, makes zero changes to Discord
npm run setup:apply    # Actually creates/updates roles, categories, channels, and permission overwrites
```

Review the dry-run output carefully before applying. Key guarantees:

- **Idempotent**: re-running `setup:apply` after it already succeeded reports "nothing to do" — it matches existing
  roles/channels by name and only creates what's missing.
- **Never destructive**: it will not delete or rename any existing channel, role, or message, even if you later
  remove something from the blueprint. It only adds, and reconciles permissions on things it manages.
- **Doesn't clobber manual overrides**: channel permission changes are applied per-role via `edit()`, not a full
  `set()` — a moderator's manual per-user mute overwrite on a channel is left alone.
- It writes **`server-map.json`** (gitignored) mapping blueprint keys (`"moderator"`, `"moderatorLog"`, ...) to the
  real Discord IDs for your server. The bot reads this file at runtime — **run `setup:apply` before starting the
  bot**, and re-run it any time you edit the blueprint.

## 5. Register slash commands

```bash
npm run deploy-commands           # registers to DISCORD_GUILD_ID — instant, best for development
npm run deploy-commands:global    # registers globally — can take up to ~1 hour to propagate everywhere
```

Re-run whichever one any time you add/change a command in `src/commands/`.

## 6. Run the bot

```bash
npm run dev      # ts-node-style dev run with auto-reload (tsx watch)
# or, for production:
npm run build
npm start
```

## Project structure

```
src/
  commands/        one file per slash command (default-exports a Command)
  events/          one file per Discord gateway event (default-exports a BotEvent)
  config/
    blueprint.ts   declarative desired server state (roles, categories, channels, permissions)
    types.ts       types for the blueprint
    serverMap.ts   load/save of server-map.json (blueprint key -> live Discord ID)
  services/        feature logic: setupService, verification, selfRoles, moderation, automod, tickets
  db/              SQLite (better-sqlite3): warnings, tickets, message-count stats
  utils/           permissions (role-hierarchy checks), dynamic command/event loader
  env.ts           zod-validated environment loading
  logger.ts        pino structured logging (console + logs/bot.log)
  index.ts         bot bootstrap
  deploy-commands.ts
scripts/
  setup-server.ts  CLI entrypoint for the dry-run/apply setup flow
```

## What gets built

**Server structure**: START HERE / COMMUNITY / EVENTS / SUPPORT / STAFF / TICKETS categories with the channels listed
in the project brief, plus a staff-only `#ticket-logs` channel for closed-ticket transcripts.

**Roles** (top → bottom): Owner, Administrator, Bot, Moderator, Community Manager, VIP, Member, New Member, plus
three non-hierarchy opt-in notification roles (Event Pings, Announcement Pings, Community Updates Pings) used by
`/roles`. `@everyone`'s base guild permissions are stripped to zero — visibility and posting rights are granted
entirely through per-channel overwrites, so nothing is accessible until a role explicitly allows it.

**Automation**:
- Welcome message + automatic "New Member" role on join.
- Persistent "✅ I Accept" button on `#rules` that swaps New Member → Member.
- `/roles` self-assignable notification roles via a select menu.
- `/warn /timeout /kick /ban` with role-hierarchy permission checks and `#moderator-log` audit embeds.
- Spam/link automod: blocks Discord invite links and mass-mention messages from non-staff, rate-limits bursts,
  deletes the offending message, DMs the user, and logs the action. Moderator+ are exempt.
- Ticket system: `/ticket` (or the button in `#open-a-ticket`) opens a private channel; `/close` (or the in-channel
  button) posts a transcript to `#ticket-logs`, locks the channel, and auto-deletes it 24 hours later.
- `/announce` posts a formatted embed to `#announcements` (Community Manager+), with an optional `@everyone` ping.
- Minimal engagement tracking: per-user message counts in SQLite, surfaced via `/serverinfo`.

**Permission checks**: every admin/mod command checks the caller's role rank against `server-map.json` (via
`src/utils/permissions.ts`) in addition to Discord's native `default_member_permissions` gate on the command itself
— so behavior stays correct even if someone edits command permissions in Discord's own UI.

## Safety notes

- Tokens are never hardcoded — only read from `.env` via a validated loader that fails fast if anything's missing.
- All setup operations default to dry-run; nothing touches your live server until you explicitly pass `--apply`.
- The setup script is safe to re-run at any time — it reconciles rather than recreating.
- No command or background job deletes channels, roles, or arbitrary messages. The only deletions in the whole
  system are: (a) individual messages removed by automod for policy violations, and (b) closed ticket channels,
  which are archived (transcript + lock) before being auto-deleted 24h later — both are normal, expected behavior of
  the features you approved, not the setup script touching your server structure.
- Logs go to the console and `logs/bot.log` (pino), and moderation actions are additionally logged in Discord via
  `#moderator-log` / `#ticket-logs`.

## Troubleshooting

- **"Could not automatically reorder roles"** during `setup:apply`: the bot's own role isn't high enough yet. Drag
  it above "Moderator" in Server Settings → Roles, then re-run `npm run setup:apply`.
- **Features silently no-op with a log warning**: `server-map.json` is missing or stale — run `npm run setup:apply`.
- **Slash commands not showing up**: guild-scoped registration is instant; global registration can take up to an
  hour. Make sure you ran `npm run deploy-commands` (or `:global`) after your latest command changes.
- **`ExperimentalWarning: SQLite is an experimental feature`** on startup: expected — `node:sqlite` is still marked
  experimental upstream even though it's stable in practice here. Safe to ignore.

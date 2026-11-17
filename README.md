# Community Discord Bot — International Mental Wellbeing & Personal Growth

A Node.js + TypeScript + discord.js bot that configures and runs an international, peer-support Discord community
focused on mental wellbeing, mindfulness, and personal growth. Server structure, roles, onboarding, moderation,
events, engagement, and a premium-membership foundation are all built in; nothing has been applied to a live Discord
server, and no real payment processing is wired in — both require your explicit go-ahead (see **Outstanding items**
at the end).

## 1. Prerequisites

- Node.js 22.5+ (uses the built-in `node:sqlite`-free stack — Postgres via Prisma instead)
- [Docker](https://www.docker.com/) (for a local Postgres via `docker-compose.yml`) — or any reachable Postgres 14+
- A Discord server (guild) you own or administrate
- A Discord Application + Bot at https://discord.com/developers/applications

## 2. Create and invite the bot

1. [Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → **Reset Token** → copy it (`DISCORD_TOKEN`). Never commit this anywhere.
3. Same **Bot** tab, enable these **Privileged Gateway Intents**:
   - **Server Members Intent** (onboarding / role assignment on join)
   - **Message Content Intent** (spam/link automod)
4. **General Information** tab → copy the **Application ID** (`DISCORD_CLIENT_ID`).
5. **OAuth2 → URL Generator**: scopes `bot` + `applications.commands`. Bot permissions: **Administrator** is simplest
   for the initial setup run (it needs to create/edit roles and channels, including ones that outrank most others).
   Invite the bot via the generated URL.
6. **Role position**: right after inviting, drag the bot's own role (Server Settings → Roles) above where
   "Moderator" will end up. The setup script tries to do this automatically on `--apply`, but it can only move roles
   below its own, so the very first time may need a manual nudge.
7. Right-click your server icon (Developer Mode on) → **Copy Server ID** → `DISCORD_GUILD_ID`.

## 3. Install, configure, and stand up the database

```bash
npm install
cp .env.example .env
docker compose up -d        # local Postgres matching the default DATABASE_URL in .env.example
```

Fill in `.env` — at minimum `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DATABASE_URL`. See
**Environment variables** below for the full list. `.env` is gitignored — never commit it.

```bash
npm run db:migrate          # applies all Prisma migrations to your database (dev-friendly, interactive)
# in production, use: npm run db:deploy
```

## 4. Configure the Discord server structure (dry-run first!)

The entire category/channel/role structure lives in `src/config/blueprint.ts` as data. `scripts/setup-server.ts`
reads your live server, diffs it against the blueprint, and reports a plan — it never writes anything unless you
pass `--apply`.

```bash
npm run setup          # DRY RUN — prints the plan, zero Discord writes
npm run setup:apply    # Creates/updates roles, categories, channels, and permission overwrites
```

Guarantees:
- **Idempotent** — re-running after success reports "nothing to do"; matches by name, only creates what's missing.
- **Never destructive** — never deletes or renames anything, even if you remove something from the blueprint later.
- **Doesn't clobber manual overrides** — permission edits are per-role (`edit()`), not a full replace, so a mod's
  manual per-user mute on a channel survives a re-run.
- Writes **`server-map.json`** (gitignored) mapping blueprint keys to real Discord IDs — the bot reads this at
  runtime. Re-run `setup:apply` any time you edit the blueprint.

> ⚠️ **If you're reusing a guild that previously had a different bot structure on it** (e.g. a prior prototype), the
> setup script will not remove the old roles/channels — you'll end up with both side by side until you manually
> delete the old ones in Discord yourself.

## 5. Register slash commands

```bash
npm run deploy-commands           # registers to DISCORD_GUILD_ID — instant, best for development
npm run deploy-commands:global    # registers globally — can take up to ~1 hour to propagate
```

## 6. Run the bot

```bash
npm run dev      # tsx watch — auto-reload for development
# production:
npm run build
npm start
```

## 7. Run the tests

```bash
docker compose up -d && npm run db:migrate   # integration tests need a real, migrated Postgres
npm test
```

---

## Project architecture

```
src/
  commands/            one file per slash command (default-exports a Command)
  events/              one file per Discord gateway event (default-exports a BotEvent)
  config/
    blueprint.ts       declarative desired server state (roles, categories, channels incl. voice, permissions)
    types.ts           types for the blueprint
    serverMap.ts       load/save of server-map.json (blueprint key -> live Discord ID)
  modules/             business logic, grouped by domain — commands/events call into these, never the other way
    onboarding/        welcome message, #start-here orientation, guidelines acknowledgment
    roles/             interest + notification self-assignable roles
    moderation/        mod-log, automod, member reports, retention purge
    events/            event propose/approve/publish, RSVP embeds, timezone conversion, reminders
    engagement/        scheduled prompts, prompt content, resource-submission announcements
    membership/        premium tier + Discord role sync, payment-webhook foundation
  db/                  one file per domain: Prisma queries only, no business logic
  services/            generic infra: setupService (the dry-run/apply engine), permission-bitfield helpers
  utils/               role-hierarchy permission checks, dynamic command/event loader
  env.ts / envSchema.ts  zod-validated environment loading (schema split out for testability)
  logger.ts            pino structured logging (console + logs/bot.log)
  index.ts             bot bootstrap
  deploy-commands.ts
prisma/
  schema.prisma        all data models
  migrations/          committed, applied migrations
scripts/
  setup-server.ts      CLI for the dry-run/apply setup flow
docker-compose.yml      local Postgres for development
```

## Complete feature list

- **Server structure**: 9 categories, ~34 text channels, 4 voice channels, 21 roles — see `src/config/blueprint.ts`.
- **Onboarding**: welcome message → `#start-here` orientation → `#community-guidelines` acknowledgment (button) →
  grants Member → immediately offers interest-role and notification-role pickers → mentions `#introductions` as
  optional. No step ever asks for a diagnosis, medical history, trauma, or any sensitive disclosure.
- **Self-service roles**: 6 interest roles + 4 notification roles via `/roles`, structurally guaranteed to carry zero
  Discord permissions (enforced by a blueprint invariant test, not just convention).
- **Moderation & safety**: `/report` → staff review workflow in `#member-reports`; `/warn /timeout /kick /ban`;
  `/modlog` warning-history lookup; spam/invite-link/rate-limit automod (message content is **not** logged by
  default); access-controlled `#moderation-log`/`#member-reports`; configurable retention auto-purge.
- **Events**: `/event-create /event-list /events /event-cancel /event-remind /event-rsvp /event-feedback`; Facilitator/Event
  Host propose → Community Manager approves → bot publishes as a real Discord Scheduled Event → automatic + manual
  reminders → RSVP tracking → post-event feedback. Timezone-safe (UTC storage, DST-correct conversion, Discord-native
  local-time display).
- **Engagement**: scheduled daily reflection / twice-weekly gratitude / weekly challenge posts (env-togglable,
  deliberately infrequent, no streak tracking, no pressure language); on-demand `/daily-prompt /gratitude-prompt
  /weekly-reflection`; `/resource-submit` auto-announces shared resources.
- **Membership**: free tier (everything except the Premium Experiences category) vs. premium (extra meditation
  sessions, workshops, curated resources, premium events); `/membership` (self-view, Admin+ to manage others),
  `/premium-info`; technical foundation for a future payment integration (disabled by default — see below).
- **General/admin commands**: `/help /rules /community-info /serverinfo /announce /setup-check /server-audit
  /backup-status /bot-health /config-report`.
- **Security**: least-privilege Discord permissions per role, `.env`-only secrets, zod-validated config, dry-run-first
  server changes, role-hierarchy + native-permission double-gated commands, no card data ever stored.

## Role & permission matrix

| Rank | Role | Key Discord permissions | Notes |
|---|---|---|---|
| 100 | Founder | Administrator | |
| 90 | Administrator | Administrator | |
| 85 | Bot | Manage Roles/Channels/Messages/Nicknames, Kick/Ban/Timeout, Webhooks, Audit Log, Mention Everyone, Manage Events, + base chat/voice | Managed role; never Administrator |
| 80 | Moderator | Kick/Ban/Timeout, Manage Messages/Nicknames/Threads, Audit Log | Sees `#member-reports`/`#moderation-log` |
| 70 | Community Manager | Manage Messages/Events/Webhooks, Mention Everyone, Invite | Approves events; does **not** see `#member-reports` |
| 55 | Event Host | base chat/voice only | No mod/admin, by spec |
| 55 | Facilitator | base chat/voice only | No mod/admin; no `#member-reports`/`#moderation-log` access |
| 50 | Community Guide | base chat/voice only | Onboarding/welcoming helper, no moderation power |
| 45 | Premium Member | base chat/voice + external emoji/stickers | Unlocks Premium Experiences category |
| 40 | Member | base chat/voice | Granted after guidelines acknowledgment |
| 30 | New Member | reduced chat, no voice, no embeds/attachments | Until guidelines acknowledged |
| ~0–5 | 6 interest + 4 notification roles | **none, structurally enforced** | Covered by an automated test |

`@everyone`'s base guild permissions are stripped to zero — all visibility/posting is granted per-channel, so
nothing is accessible until a role explicitly allows it.

## Database schema

PostgreSQL via Prisma (`prisma/schema.prisma`). Run `npm run db:migrate` (dev) or `npm run db:deploy` (prod) after
pulling schema changes; `npm run db:studio` opens a local data browser.

| Model | Purpose |
|---|---|
| `Warning` | Staff-issued warnings (`/warn`, viewed via `/modlog`) — staff-authored text only, never raw message content |
| `Report` | `/report` submissions + staff review status (open/reviewed/resolved) |
| `Event` / `EventRsvp` / `EventFeedback` | Event lifecycle, RSVPs, post-event feedback |
| `MessageStat` | Per-user message counts (minimal engagement signal, surfaced via `/serverinfo`) |
| `EngagementState` | Last-posted timestamp per scheduled prompt type, so restarts never double-post |
| `Membership` | Current tier (free/premium) + status per member |
| `ProcessedWebhookEvent` | Idempotency ledger for a future payment webhook (unused until one exists) |

**Retention**: `MODERATION_LOG_RETENTION_DAYS` (default 180) auto-purges old warnings and reviewed/resolved reports
daily. **Open reports are never auto-purged**, regardless of age.

## Slash command reference

| Command | Who | Notes |
|---|---|---|
| `/help` | everyone | Lists all commands |
| `/rules` | everyone | Shows community guidelines |
| `/roles` | everyone | Pick interest/notification roles |
| `/community-info` | everyone | What the community is (and isn't) |
| `/serverinfo` | everyone | Server stats + your tracked activity |
| `/events`, `/event-list` | everyone | Upcoming published events (two names, same feature — see Outstanding items) |
| `/event-rsvp` | everyone | RSVP going/interested/not going |
| `/event-feedback` | everyone | Feedback on a past event |
| `/membership` | everyone (self); Admin+ for others | View tier; Admin+ can set a member's tier |
| `/premium-info` | everyone | What premium includes |
| `/daily-prompt` `/gratitude-prompt` `/weekly-reflection` | everyone | On-demand ephemeral prompts |
| `/resource-submit` | everyone | Share a resource; auto-announced |
| `/report` | everyone (incl. New Member) | Private report to staff |
| `/announce` | Community Manager+ | Posts to `#announcements` |
| `/event-create` | Event Host/Facilitator/Community Manager+ | Propose or (CM+) directly publish an event |
| `/event-cancel` `/event-remind` | event owner, or Community Manager+ | |
| `/warn` `/timeout` `/kick` | Moderator+ | Logged to `#moderation-log` |
| `/ban` | Administrator+ | |
| `/modlog` | Moderator+ | A member's warning history |
| `/bot-health` | Moderator+ | Uptime/latency/memory |
| `/setup-check` `/server-audit` `/backup-status` `/config-report` | Administrator+ | Read-only diagnostics, no Discord writes |

Every admin/mod command checks the caller's role rank against `server-map.json` (`src/utils/permissions.ts`) **in
addition to** Discord's native `default_member_permissions` gate — correct even if someone edits command permissions
in Discord's own UI.

## Onboarding

See **Complete feature list** above for the flow; implementation in `src/modules/onboarding/`. The guidelines text
(`COMMUNITY_GUIDELINES_TEXT` in `guidelines.ts`) explicitly states: not a therapy/medical/crisis service,
confidentiality can't be guaranteed, not monitored 24/7, contact local emergency services if in immediate danger —
plus the full prohibited-behavior list (no diagnosing, no unsolicited counselling, no harassment, no screenshots
without consent, no unverified cures). Covered by `src/modules/onboarding/guidelines.test.ts`.

## Moderation & escalation

1. **Automod** (spam, Discord invite links, message-rate bursts) acts automatically — deletes, DMs the user, logs to
   `#moderation-log`. Moderator+ are exempt. No staff action needed unless it's repeated.
2. **`/report`** is the default path for anything else. It posts privately to `#member-reports`
   (access-controlled — Moderator/Administrator/Founder/Bot only) with **Mark Reviewed** / **Resolve** buttons.
3. For violations staff witness directly: `/warn` (first/minor) → `/timeout` (repeated/moderate) → `/kick`
   (persistent disruption) → `/ban` (severe — harassment, doxxing, predatory behavior, ban evasion; Administrator+
   only, intentionally not Moderator).
4. **Anything suggesting someone may be in immediate danger**: staff should not attempt crisis counselling. Direct
   the member to local emergency services / an appropriate crisis line for their country, and loop in
   Founder/Administrator. No feature in this bot is a substitute for that — it is not built or intended as a
   crisis-response tool.
5. All actions land in `#moderation-log` (without raw message content by default) and warnings are queryable via
   `/modlog`.

## Event management

`src/modules/events/`. Facilitator/Event Host propose via `/event-create` → if the proposer isn't already Community
Manager+, it's posted to `#event-planning` for approval → on approval, the bot creates a real **Discord Scheduled
Event** (Voice-typed if a voice room was picked, External otherwise) and announces to `#event-announcements` +
`#event-calendar`. Automatic reminders fire once per event, ~1 hour before start; `/event-remind` sends one on
demand. RSVPs and post-event feedback are tracked in Postgres. Dates are entered as date + time + IANA timezone,
converted to a true UTC instant (DST-safe, no extra dependency — see `timezone.ts`), and always displayed via
Discord's native `<t:...>` markup so each viewer sees their own local time automatically. Facilitators/Event Hosts
never receive elevated Discord permissions — the bot (which already holds `Manage Events`) does the actual
publishing; a host is only ever *named*, never granted anything.

## Membership (premium foundation)

Free tier is everything except the `PREMIUM EXPERIENCES` category — core support, discussions, basic meditation
sessions, community interaction, resources, events all stay free, always (`#support-and-resources` and
`#finding-professional-help` are never premium-gated). `/premium-info` never implies premium improves mental-health
outcomes — only that it adds more content/access.

`PREMIUM_ENABLED=false` by default. Right now, the only way to change a member's tier is `/membership ... set:` by
an Administrator. `src/modules/membership/webhook.ts` is a **foundation only** — generic HMAC signature verification
and an idempotent subscription-apply function — it is **not** wired to any live HTTP endpoint, because this project
is a Discord gateway bot with no HTTP server, and standing one up (hosting, public URL, provider-specific event
shapes) is new infrastructure that needs its own approval, per the original brief. No card data is ever stored or
touched.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | |
| `DISCORD_TOKEN` | **yes** | — | Bot token |
| `DISCORD_CLIENT_ID` | **yes** | — | Application ID |
| `DISCORD_GUILD_ID` | **yes** | — | Target guild |
| `DATABASE_URL` | **yes** | — | Postgres connection string |
| `COMMUNITY_NAME` | no | `COMMUNITY_NAME` | Placeholder until the real name is confirmed |
| `PREMIUM_ENABLED` | no | `false` | Gate for the (currently inert) payment-webhook path |
| `PAYMENT_PROVIDER` / `PAYMENT_WEBHOOK_SECRET` | no | empty | Unused until a provider is chosen + approved |
| `BOT_OWNER_IDS` | no | empty | Extra hard-coded safety-net user IDs (comma-separated), beyond role checks |
| `LOG_LEVEL` | no | `info` | pino log level |
| `MODERATION_LOG_RETENTION_DAYS` | no | `180` | Auto-purge window for resolved moderation records |
| `ENGAGEMENT_DAILY_PROMPT_ENABLED` / `_GRATITUDE_PROMPT_ENABLED` / `_WEEKLY_CHALLENGE_ENABLED` | no | `true` | Toggle scheduled prompts (restart to apply) |

## Testing

```bash
docker compose up -d && npm run db:migrate
npm test
```

61 tests across 10 files (Vitest). Covers: role-hierarchy permission checks (incl. the native-Administrator bypass
and the "interest/notification roles carry zero permissions" invariant), environment/config validation, blueprint
structural invariants that make setup idempotent (unique keys/names, every overwrite references a real role), DST-safe
timezone conversion, prompt-content invariants (no streak/pressure language), community-guidelines required
disclosures, and — against a real local Postgres — the full event/RSVP/feedback lifecycle, moderation retention
(including the "never purge an open report" rule), and membership tier + Discord-role sync.

**Not covered**: full Discord.js interaction mocking for live button/select-menu flows (onboarding button clicks,
report-review buttons, etc.) — this typically requires heavy mocking for limited signal, so it was scoped out in
favor of testing the business logic those handlers call into directly.

## Deployment

1. Any Node 22.5+ host (Railway, Render, Fly.io, a VPS, etc.) + a managed Postgres (or self-hosted with your own
   backup plan — see `/backup-status`, which deliberately does not pretend to run backups itself).
2. Set all required env vars on the host (never commit `.env`).
3. `npm ci && npm run build`
4. `npm run db:deploy` (applies committed migrations, non-interactive)
5. `npm run deploy-commands` (or `:global`) once, and again whenever commands change
6. `npm start`, under a process manager/platform restart policy so it survives crashes
7. Logs go to stdout + `logs/bot.log` via pino; pipe stdout to your platform's log aggregation in production rather
   than relying on the local log file.

## Outstanding items requiring your approval

1. **Nothing has been applied to your live Discord server.** `npm run setup:apply` and `npm run deploy-commands`
   both need your explicit go-ahead — and per our earlier conversation, if you're reusing the guild that already had
   a different bot structure on it, you'll want to delete that old structure yourself first (the setup script won't
   touch it automatically).
2. **Real payment processing is not implemented**, per your instruction — only the schema + signature-verification +
   idempotent-apply foundation. Enabling it needs: choosing a provider, standing up a webhook HTTP endpoint (new
   infrastructure this project doesn't currently have), setting `PAYMENT_PROVIDER`/`PAYMENT_WEBHOOK_SECRET`, and
   flipping `PREMIUM_ENABLED=true`.
3. **`COMMUNITY_NAME`** is still the literal placeholder — update it in `.env` once the name is confirmed (no code
   change needed).
4. **Engagement prompt on/off is `.env`-based** (restart-to-apply), not a live slash-command toggle — flagging in
   case you'd prefer a live `/engagement-config`-style command instead.
5. **`/events` and `/event-list`** were both built (same underlying feature) since your spec named both explicitly
   rather than guessing which to drop — let me know if you'd like one removed.
6. **Automated database backups are intentionally not run by this bot** — that's a hosting-layer responsibility;
   `/backup-status` gives guidance rather than faking a backup system.
7. **Discord.js interaction-level tests** (live button/select-menu flows) were scoped out in favor of testing the
   underlying business logic directly — see Testing above.

import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  project: text("project").notNull(),
  repo: text("repo").notNull(),
  source: text("source").notNull(),
  sourceUrl: text("source_url").notNull(),
  discoveredAt: text("discovered_at").notNull(),
  stack: text("stack").notNull(),
  category: text("category").notNull(),
  reward: text("reward").notNull(),
  fundingSignal: text("funding_signal").notNull(),
  deadline: text("deadline").notNull(),
  launchStage: text("launch_stage").notNull(),
  existingAudits: text("existing_audits").notNull(),
  bountyProgram: text("bounty_program").notNull(),
  contact: text("contact").notNull(),
  fitReason: text("fit_reason").notNull(),
  suggestedScope: text("suggested_scope").notNull(),
  outreachDraft: text("outreach_draft").notNull(),
  stage: text("stage").notNull().default("New"),
  score: integer("score").notNull(),
  scoreBreakdown: text("score_breakdown").notNull(),
  summary: text("summary").notNull(),
  evidenceConfidence: text("evidence_confidence").notNull().default("inferred"),
  evidenceNote: text("evidence_note").notNull().default(""),
  topics: text("topics").notNull().default("[]"),
  technologies: text("technologies").notNull().default("[]"),
  ecosystem: text("ecosystem").notNull().default("Multi-chain"),
  sourceTier: text("source_tier").notNull().default("Major"),
  rewardPaths: text("reward_paths").notNull().default("[]"),
  difficulty: text("difficulty").notNull().default("Intermediate"),
  competitionLevel: text("competition_level").notNull().default("Unknown"),
  competitionConfidence: text("competition_confidence").notNull().default("unknown"),
  visibilityLevel: text("visibility_level").notNull().default("Unknown"),
  winnerCount: integer("winner_count").notNull().default(0),
  participationRewards: integer("participation_rewards", { mode: "boolean" }).notNull().default(false),
  earningScore: integer("earning_score").notNull().default(0),
  earningBreakdown: text("earning_breakdown").notNull().default("{}"),
  syncedAt: text("synced_at").notNull(),
});

export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  goals: text("goals").notNull().default("[]"),
  stacks: text("stacks").notNull().default("[]"),
  chains: text("chains").notNull().default("[]"),
  specialties: text("specialties").notNull().default("[]"),
  tools: text("tools").notNull().default("[]"),
  experienceLevel: text("experience_level").notNull().default("Growing"),
  portfolioUrl: text("portfolio_url").notNull().default(""),
  minReward: integer("min_reward").notNull().default(0),
  availability: text("availability").notNull().default("Flexible"),
  weeklyHours: integer("weekly_hours").notNull().default(10),
  difficultyPreference: text("difficulty_preference").notNull().default("Any"),
  participationMode: text("participation_mode").notNull().default("Either"),
  region: text("region").notNull().default("Global"),
  scopedOnly: integer("scoped_only", { mode: "boolean" }).notNull().default(true),
  alertFrequency: text("alert_frequency").notNull().default("Daily"),
  alertChannel: text("alert_channel").notNull().default("In-app"),
  alertDestination: text("alert_destination").notNull().default(""),
  passportHeadline: text("passport_headline").notNull().default("Independent Web3 security researcher"),
  passportBio: text("passport_bio").notNull().default(""),
  passportSlug: text("passport_slug").notNull().default(""),
  passportPublic: integer("passport_public", { mode: "boolean" }).notNull().default(false),
  githubUrl: text("github_url").notNull().default(""),
  auditReportUrls: text("audit_report_urls").notNull().default("[]"),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const userLeadState = sqliteTable("user_lead_state", {
  userId: text("user_id").notNull(),
  leadId: text("lead_id").notNull(),
  saved: integer("saved", { mode: "boolean" }).notNull().default(false),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  pitchedAt: text("pitched_at"),
  notes: text("notes").notNull().default(""),
  nextActionAt: text("next_action_at"),
  outcome: text("outcome").notNull().default(""),
  outcomeNote: text("outcome_note").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.leadId] })]);

export const watchlists = sqliteTable("watchlists", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  stacks: text("stacks").notNull().default("[]"),
  categories: text("categories").notNull().default("[]"),
  minReward: integer("min_reward").notNull().default(0),
  verifiedOnly: integer("verified_only", { mode: "boolean" }).notNull().default(false),
  lowVisibilityOnly: integer("low_visibility_only", { mode: "boolean" }).notNull().default(false),
  alternativeRewardsOnly: integer("alternative_rewards_only", { mode: "boolean" }).notNull().default(false),
  maxCompetitionLevel: text("max_competition_level").notNull().default("Any"),
  deadlineDays: integer("deadline_days").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const notificationLog = sqliteTable("notification_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull(),
  itemCount: integer("item_count").notNull().default(0),
  detail: text("detail").notNull().default(""),
  sentAt: text("sent_at").notNull(),
});

export const syncState = sqliteTable("sync_state", {
  source: text("source").primaryKey(),
  lastSyncedAt: text("last_synced_at").notNull(),
  status: text("status").notNull(),
  itemCount: integer("item_count").notNull().default(0),
  error: text("error"),
});

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull().default(0),
});

export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

export const telegramConnections = sqliteTable("telegram_connections", {
  userId: text("user_id").primaryKey(),
  chatId: text("chat_id").notNull(),
  username: text("username").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  connectedAt: text("connected_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const telegramLinkTokens = sqliteTable("telegram_link_tokens", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: text("used_at"),
});
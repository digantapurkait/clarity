-- MindMantra MySQL Schema
-- Run: mysql -u root -p mindmantra < db/schema.sql

CREATE DATABASE IF NOT EXISTS mindmantra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mindmantra;

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   INT PRIMARY KEY AUTO_INCREMENT,
  email                VARCHAR(255) UNIQUE NOT NULL,
  name                 VARCHAR(255),
  personality_summary  TEXT,
  relationship_summary TEXT,
  language_preference  VARCHAR(10) DEFAULT 'en',
  user_archetype        VARCHAR(50),
  preferred_depth       VARCHAR(20),
  challenge_tolerance   VARCHAR(20),
  clarity_progress      INT DEFAULT 0,
  created_at           DATETIME DEFAULT NOW(),
  updated_at           DATETIME DEFAULT NOW() ON UPDATE NOW()
);

-- ─────────────────────────────────────────────
-- NEXT-AUTH REQUIRED TABLES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id                  VARCHAR(191) PRIMARY KEY,
  user_id             INT NOT NULL,
  type                VARCHAR(191) NOT NULL,
  provider            VARCHAR(191) NOT NULL,
  provider_account_id VARCHAR(191) NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          BIGINT,
  token_type          VARCHAR(191),
  scope               VARCHAR(191),
  id_token            TEXT,
  session_state       VARCHAR(191),
  UNIQUE KEY provider_account (provider, provider_account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions_auth (
  id            VARCHAR(191) PRIMARY KEY,
  session_token VARCHAR(191) UNIQUE NOT NULL,
  user_id       INT NOT NULL,
  expires       DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier VARCHAR(191) NOT NULL,
  token      VARCHAR(191) UNIQUE NOT NULL,
  expires    DATETIME NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ─────────────────────────────────────────────
-- SESSIONS (emotional arc sessions)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  guest_id VARCHAR(255) NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sealed_at TIMESTAMP NULL,
  phase VARCHAR(50) DEFAULT 'ENTRY',
  clarity_generated BOOLEAN DEFAULT FALSE,
  mantra TEXT,
  session_summary TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- CONVERSATION STATE (analytical layer)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_state (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  guest_id VARCHAR(255) NULL,
  current_phase VARCHAR(50),
  emotional_tone VARCHAR(50),
  clarity_progress INT DEFAULT 0,
  engagement_level VARCHAR(50),
  updated_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- EXTRACTED PATTERNS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS extracted_patterns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  guest_id VARCHAR(255) NULL,
  dominant_drive VARCHAR(255),
  recurring_blocker VARCHAR(255),
  motivation_type VARCHAR(255),
  last_updated DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  session_id   INT NOT NULL,
  user_id      INT NULL,
  role         ENUM('user','assistant') NOT NULL,
  content      TEXT NOT NULL,
  created_at   DATETIME DEFAULT NOW(),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- MEMORY EVENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_events (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  user_id          INT NOT NULL,
  memory_type      ENUM('recurring_worry','positive_trigger','habit_pattern','emotional_cycle') NOT NULL,
  memory_summary   TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.5,
  created_at       DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- WEEKLY INSIGHTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_insights (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  user_id             INT NOT NULL,
  detected_pattern    TEXT,
  suggested_mantra    VARCHAR(500),
  improvement_focus   TEXT,
  week_start_date     DATE NOT NULL,
  created_at          DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- FOUNDER NOTES (manual memory injection)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS founder_notes (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  user_id        INT NOT NULL,
  note           TEXT NOT NULL,
  scheduled_for  DATE NOT NULL,
  used           BOOLEAN DEFAULT FALSE,
  created_at     DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

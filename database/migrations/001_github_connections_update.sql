-- Migration 001: Update github_connections table for OAuth token storage
-- Run this if you created the DB with the original schema.sql

ALTER TABLE github_connections
  DROP COLUMN IF EXISTS github_login,
  DROP COLUMN IF EXISTS encrypted_token,
  DROP COLUMN IF EXISTS token_hint,
  DROP COLUMN IF EXISTS connected_at;

ALTER TABLE github_connections
  ADD COLUMN IF NOT EXISTS github_username   VARCHAR(255) NOT NULL DEFAULT '' AFTER github_user_id,
  ADD COLUMN IF NOT EXISTS github_avatar_url VARCHAR(1024) AFTER github_username,
  ADD COLUMN IF NOT EXISTS access_token      TEXT NOT NULL DEFAULT '' AFTER github_avatar_url,
  ADD COLUMN IF NOT EXISTS scope             VARCHAR(255) AFTER access_token,
  ADD COLUMN IF NOT EXISTS created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER scope,
  ADD COLUMN IF NOT EXISTS updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Add UNIQUE constraint on user_id (one GitHub account per ShipPilot user)
ALTER TABLE github_connections
  ADD UNIQUE KEY uq_user_id (user_id);

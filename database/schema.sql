-- ShipPilot Database Schema
-- Run order matters — foreign keys require parent tables first

CREATE TABLE IF NOT EXISTS users (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS github_connections (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id           INT UNSIGNED NOT NULL UNIQUE,
    github_user_id    VARCHAR(100) NOT NULL,
    github_username   VARCHAR(255) NOT NULL,
    github_avatar_url VARCHAR(1024),
    access_token      TEXT NOT NULL,
    scope             VARCHAR(255),
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS repositories (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    github_repo_id  VARCHAR(100) NOT NULL UNIQUE,
    owner           VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    full_name       VARCHAR(512) NOT NULL,
    clone_url       VARCHAR(1024),
    default_branch  VARCHAR(255) NOT NULL DEFAULT 'main',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    repository_id   INT UNSIGNED NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (repository_id) REFERENCES repositories(id)
);

CREATE TABLE IF NOT EXISTS environments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id  INT UNSIGNED NOT NULL,
    name            ENUM('development', 'staging', 'production') NOT NULL,
    deployment_target VARCHAR(512),
    health_check_url  VARCHAR(1024),
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_app_env (application_id, name),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deployments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id  INT UNSIGNED NOT NULL,
    environment_id  INT UNSIGNED NOT NULL,
    triggered_by    INT UNSIGNED NOT NULL,
    branch          VARCHAR(255) NOT NULL,
    commit_sha      VARCHAR(40) NOT NULL,
    commit_message  TEXT,
    status          ENUM('queued','running','succeeded','failed','cancelled') NOT NULL DEFAULT 'queued',
    github_run_id   VARCHAR(100),
    release_note    TEXT,
    started_at      DATETIME,
    finished_at     DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id),
    FOREIGN KEY (environment_id) REFERENCES environments(id),
    FOREIGN KEY (triggered_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deployment_events (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    deployment_id   INT UNSIGNED NOT NULL,
    stage           VARCHAR(100) NOT NULL,
    status          ENUM('started','completed','failed') NOT NULL,
    message         TEXT,
    occurred_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED,
    action          VARCHAR(255) NOT NULL,
    resource_type   VARCHAR(100),
    resource_id     INT UNSIGNED,
    meta            JSON,
    ip_address      VARCHAR(45),
    occurred_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

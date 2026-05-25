#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-zjj-zombie-game}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BRANCH="${DEPLOY_BRANCH:-feature_examples}"

cd "$PROJECT_DIR"

echo "==> project: $PROJECT_DIR"
echo "==> branch: $BRANCH"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" pull
docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" up -d

docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" ps

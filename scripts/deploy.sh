#!/usr/bin/env bash
# Despliega el repo al LXC 118 (root@192.168.1.86, /opt/kitsune-cards).
#
#   bash scripts/deploy.sh
#
# Es el procedimiento de la sección «Deploy en el LXC» del CLAUDE.md, que
# explica el porqué de cada paso. Acá vive el comando; allá, las razones.
# Antes de correrlo: tsc, vitest y playwright en verde, y el cambio commiteado.
#
# No corre migraciones ni borra archivos que el repo ya no tiene: las dos
# cosas se hacen a mano, como dice el CLAUDE.md.
set -euo pipefail

# Desde la raíz del repo, se llame desde donde se llame.
cd "$(dirname "$0")/.."

rm -f /tmp/kc.tar.gz
tar czf /tmp/kc.tar.gz \
  --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='test-results' \
  --exclude='*.db' --exclude='*.db-wal' --exclude='*.db-shm' --exclude='*.sqlite*' \
  --exclude='*.bak-before-rename' --exclude='*.mp4' --exclude='tsconfig.tsbuildinfo' \
  app components lib public scripts e2e tests data docs \
  package.json package-lock.json next.config.ts tsconfig.json theme.ts \
  drizzle.config.ts eslint.config.mjs playwright.config.ts vitest.config.mts \
  AGENTS.md CLAUDE.md README.md

# El seguro: si el tar se llevó una base o su WAL, no se copia nada.
if tar tzf /tmp/kc.tar.gz | grep -qE '\.db($|-)|\.sqlite'; then
  echo '!!! ABORTAR: el tar lleva una base !!!'
  exit 1
fi
echo 'tar limpio'

scp -q /tmp/kc.tar.gz root@192.168.1.86:/tmp/kc.tar.gz
ssh root@192.168.1.86 'set -e
systemctl stop kitsune-cards.service
cp -a /opt/kitsune-cards/database.db /opt/kitsune-cards/database.db.bak-$(date +%Y%m%d-%H%M%S)
tar xzf /tmp/kc.tar.gz -C /opt/kitsune-cards --no-same-owner --no-same-permissions
chown -R kitsune:kitsune /opt/kitsune-cards
cd /opt/kitsune-cards
su kitsune -s /bin/bash -c "npm install" >/dev/null 2>&1
su kitsune -s /bin/bash -c "npm run build" >/dev/null 2>&1
systemctl start kitsune-cards.service
sleep 4
echo -n "servicio: "; systemctl is-active kitsune-cards.service
curl -s -o /dev/null -w "health: %{http_code}\n" --max-time 8 http://localhost:3000/'

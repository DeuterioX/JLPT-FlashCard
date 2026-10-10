#!/usr/bin/env bash
# Despliega el repo al LXC 118 (root@192.168.1.86, /opt/kitsune-cards).
#
#   bash scripts/deploy.sh
#
# Es el procedimiento de la sección «Deploy en el LXC» del CLAUDE.md, que
# explica el porqué de cada paso. Acá vive el comando; allá, las razones.
# Antes de correrlo: tsc, vitest y playwright en verde, y el cambio commiteado.
#
# No corre migraciones: eso se hace a mano, como dice el CLAUDE.md.
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
cd /opt/kitsune-cards
# El tar no borra: sin esto, un archivo renombrado o borrado en el repo sigue
# acá y rompe el build. Sólo carpetas de código; la base y data/ no se tocan.
rm -rf app components lib public scripts e2e tests
tar xzf /tmp/kc.tar.gz -C /opt/kitsune-cards --no-same-owner --no-same-permissions
chown -R kitsune:kitsune /opt/kitsune-cards
su kitsune -s /bin/bash -c "npm install" >/dev/null 2>&1
# Next 16.3.8 rechaza una caché de SWC con una carpeta padre escribible por el grupo.
chmod g-w /home/kitsune/.cache 2>/dev/null || true
# Si el build falla, vuelve el anterior y el servicio se levanta igual: un
# build roto no puede dejar la app caída.
rm -rf .next.prev
if [ -d .next ]; then mv .next .next.prev; fi
if ! su kitsune -s /bin/bash -c "npm run build" > /tmp/kc-build.log 2>&1; then
  tail -30 /tmp/kc-build.log
  rm -rf .next
  if [ -d .next.prev ]; then mv .next.prev .next; fi
  systemctl start kitsune-cards.service
  echo "!!! EL BUILD FALLÓ: quedó levantado el build anterior"
  exit 1
fi
rm -rf .next.prev
systemctl start kitsune-cards.service
sleep 4
echo -n "servicio: "; systemctl is-active kitsune-cards.service
curl -s -o /dev/null -w "health: %{http_code}\n" --max-time 8 http://localhost:3000/'

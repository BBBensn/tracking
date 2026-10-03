#!/usr/bin/env bash
# testmode.sh — Test-Stack gegen eine KOPIE der Datenbank (läuft auf dem Server, nicht lokal).
#
#   ssh bensn 'bash -s up'   < tracking/tools/testmode.sh    Kopie der DB frisch anlegen + Test-APIs starten
#   ssh bensn 'bash -s down' < tracking/tools/testmode.sh    Test-APIs stoppen + Kopie löschen
#
# Startet bensn-api-test (Port 5011) und bensn-health-api-test (Port 5018) mit demselben Code wie
# produktiv (api.py / app.py werden read-only gemountet), aber mit DATABASE_URL auf `bensnos_test`.
# Damit lassen sich ALLE Schreibpfade (Schichten, Pausen, Medikamente, Mahlzeiten …) gefahrlos
# durchspielen. Lokal dazu: Tunnel auf 5011/5018 und `tools/devserver.py` mit
# API_UPSTREAM / HAPI_UPSTREAM (siehe tracking/CLAUDE.md). Secrets kommen aus /root/bensn-hub/.env
# und werden nie ausgegeben.
set -euo pipefail
cd /root/bensn-hub
set -a; . ./.env; set +a
DB=bensnos_test
NET=bensn-hub_default
URL="postgresql://bensn:${POSTGRES_PASSWORD}@postgres:5432/${DB}"

case "${1:-}" in
  up)
    docker rm -f bensn-api-test bensn-health-api-test >/dev/null 2>&1 || true
    docker exec bensn-postgres psql -U bensn -d postgres -q -c "DROP DATABASE IF EXISTS ${DB}" -c "CREATE DATABASE ${DB}"
    docker exec bensn-postgres pg_dump -U bensn -d bensnos -Fc \
      | docker exec -i bensn-postgres pg_restore -U bensn -d "${DB}" --no-owner
    docker run -d --name bensn-api-test --network "${NET}" \
      -e DATABASE_URL="${URL}" -e API_KEY="${API_KEY}" \
      -v /root/bensn-hub/api.py:/app/api.py:ro -p 127.0.0.1:5011:5001 bensn-hub-api >/dev/null
    docker run -d --name bensn-health-api-test --network "${NET}" \
      -e DATABASE_URL="${URL}" -e API_KEY="${API_KEY}" \
      -v /root/bensn-hub/health-api/app.py:/app/app.py:ro -p 127.0.0.1:5018:5008 bensn-hub-health-api >/dev/null
    sleep 4
    echo "api-test:        $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5011/health)"
    echo "health-api-test: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5018/health)"
    docker exec bensn-postgres psql -U bensn -d "${DB}" -Atc \
      "select 'Testkopie: shifts='||(select count(*) from shifts)||' tracking='||(select count(*) from tracking_entries)||' meals='||(select count(*) from health_meals)"
    ;;
  down)
    docker rm -f bensn-api-test bensn-health-api-test >/dev/null 2>&1 || true
    docker exec bensn-postgres psql -U bensn -d postgres -q -c "DROP DATABASE IF EXISTS ${DB}"
    echo "Testmodus beendet, Kopie gelöscht"
    ;;
  *)
    echo "Aufruf: bash -s up|down"; exit 1 ;;
esac

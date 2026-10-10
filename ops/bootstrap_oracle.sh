#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
printf 'Preparing VASUKI Oracle prototype\n'
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  sudo apt-get update -q
  sudo apt-get install -y docker.io docker-compose-v2
fi
sudo systemctl enable --now docker
# The existing Oracle micro VM has 1 GB of memory. Keep the runner serial and
# add swap so dependencies and n8n imports can finish without an OOM kill.
if [ "$(awk '/MemTotal/{print $2}' /proc/meminfo)" -lt 2000000 ] && ! swapon --show | grep -q .; then
  if [ ! -e /var/vasuki-prototype.swap ]; then
    sudo fallocate -l 2G /var/vasuki-prototype.swap
    sudo chmod 600 /var/vasuki-prototype.swap
    sudo mkswap /var/vasuki-prototype.swap
  fi
  sudo swapon /var/vasuki-prototype.swap
  if ! grep -q '/var/vasuki-prototype.swap' /etc/fstab; then
    printf '/var/vasuki-prototype.swap none swap sw 0 0\n' | sudo tee -a /etc/fstab >/dev/null
  fi
fi
sudo docker pull python:3.11-slim
requirements_sha=$(python3 -c "from pathlib import Path; import hashlib; print(hashlib.sha256((Path('testbed/requirements.txt').read_text().strip()+'\n').encode()).hexdigest())")
sudo docker build -f ops/Dockerfile.lab --build-arg REQUIREMENTS_SHA256="$requirements_sha" -t vasuki-python-lab:1 .
sudo docker compose -f ops/compose.oracle.yml build api
sudo docker compose -f ops/compose.oracle.yml up -d
printf 'Waiting for n8n database initialization\n'
for attempt in $(seq 1 90); do
  if curl -fsS http://127.0.0.1:5678/healthz >/dev/null; then break; fi
  sleep 2
done
# Import/publish with the service stopped so CLI changes use the same volume
# without running two Node processes in the small n8n container.
sudo docker compose -f ops/compose.oracle.yml stop n8n
sudo docker compose -f ops/compose.oracle.yml run --rm n8n import:workflow --input=/tmp/vasuki-workflow.json
sudo docker compose -f ops/compose.oracle.yml run --rm n8n publish:workflow --id=vasukiPrototype01
sudo docker compose -f ops/compose.oracle.yml up -d n8n
printf 'VASUKI deployed. Health and an end-to-end scan still require verification.\n'
sudo docker compose -f ops/compose.oracle.yml ps

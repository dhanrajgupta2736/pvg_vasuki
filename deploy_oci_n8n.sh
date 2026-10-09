#!/usr/bin/env bash
# ==============================================================================
# VASUKI // Oracle Cloud Infrastructure (OCI) n8n & Sentinel Deployment Script
# Target Host: OCI Compute Instance (Ubuntu / Oracle Linux)
# ==============================================================================

set -e

echo "=== [1/4] Updating packages and installing Docker ==="
sudo apt-get update -y || sudo yum update -y
sudo apt-get install -y docker.io docker-compose git curl || sudo yum install -y docker docker-compose git curl
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

echo "=== [2/4] Setting up persistent directory for n8n ==="
mkdir -p ~/n8n_data
sudo chown -R 1000:1000 ~/n8n_data

echo "=== [3/4] Launching n8n Container ==="
docker stop n8n 2>/dev/null || true
docker rm n8n 2>/dev/null || true

docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -e N8N_HOST=0.0.0.0 \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL=http \
  -e WEBHOOK_URL=http://137.23.45.222:5678/ \
  -v ~/n8n_data:/home/node/.n8n \
  n8nio/n8n:latest

echo "=== [4/4] Opening Firewall Ports (5678 for n8n, 8000 for VASUKI Backend) ==="
if command -v iptables &> /dev/null; then
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5678 -j ACCEPT || true
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT || true
  sudo netfilter-persistent save 2>/dev/null || true
fi

echo ""
echo "=========================================================="
echo "✅ n8n Deployment Successful on Oracle Cloud!"
echo "👉 Access n8n UI at: http://137.23.45.222:5678"
echo "👉 Import workflow: vasuki_n8n_soar_workflow.json"
echo "=========================================================="

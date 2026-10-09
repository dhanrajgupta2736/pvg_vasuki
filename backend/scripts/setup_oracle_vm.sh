#!/bin/bash
# =============================================================
# VASUKI — Oracle Cloud VM Setup Script
# Run this on your Oracle Cloud A1 Flex VM (Ubuntu 22.04)
# =============================================================

set -e

echo "🚀 VASUKI Oracle Cloud Setup Starting..."

# ── Update system ──────────────────────────────────────────
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y \
    git curl wget unzip build-essential \
    python3-pip python3-venv \
    docker.io docker-compose \
    nginx certbot \
    htop vim

# ── Enable Docker ──────────────────────────────────────────
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

echo "✅ Docker installed"

# ── Install OCI CLI ────────────────────────────────────────
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults
echo "✅ OCI CLI installed — run 'oci setup config' to configure"

# ── Clone VASUKI repo ──────────────────────────────────────
# Replace with your actual repo URL
# git clone https://github.com/YOUR_ORG/vasuki.git /opt/vasuki
# cd /opt/vasuki/backend

# ── Open firewall ports ────────────────────────────────────
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5678 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

echo "✅ Firewall configured"

# ── Setup OCI Gen AI config ────────────────────────────────
mkdir -p ~/.oci
echo "
# Fill in your OCI credentials:
# oci setup config
# Then copy ~/.oci/config to this machine

# Key values needed:
# [DEFAULT]
# user=ocid1.user.oc1..xxx
# fingerprint=xx:xx:xx:...
# tenancy=ocid1.tenancy.oc1..xxx
# region=us-chicago-1
# key_file=~/.oci/oci_api_key.pem
"

# ── Start VASUKI stack ─────────────────────────────────────
echo "
=== NEXT STEPS ===
1. Copy your .env file to /opt/vasuki/backend/.env
2. Configure OCI: run 'oci setup config'
3. Start stack: cd /opt/vasuki/backend && docker-compose up -d
4. Check health: curl http://localhost:8000/api/health
5. n8n UI: http://YOUR_VM_IP:5678 (admin / vasuki_n8n_2026)
"

echo "✅ VASUKI Oracle VM setup complete!"

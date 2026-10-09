#!/bin/sh
id
uname -a
free -m
command -v docker || true
docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null || true
sudo -n true && echo SUDO_AVAILABLE
ss -lnt | head -20

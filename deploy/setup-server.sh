#!/bin/bash
# Wayside Garage POS — Vultr Ubuntu 24.04 server setup
# Run as root: bash setup-server.sh
set -e

echo "=== Wayside Garage POS — Server Setup ==="

# ── 1. System update ─────────────────────────────────────────────────────────
apt-get update && apt-get upgrade -y

# ── 2. Install .NET 9 runtime ────────────────────────────────────────────────
apt-get install -y wget apt-transport-https
wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O /tmp/packages-microsoft-prod.deb
dpkg -i /tmp/packages-microsoft-prod.deb
apt-get update
apt-get install -y dotnet-runtime-9.0

# ── 3. Install PostgreSQL 16 ─────────────────────────────────────────────────
apt-get install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
DB_PASSWORD=$(openssl rand -base64 32)
sudo -u postgres psql <<SQL
CREATE USER wayside_user WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE wayside OWNER wayside_user;
GRANT ALL PRIVILEGES ON DATABASE wayside TO wayside_user;
SQL

echo ""
echo ">>> PostgreSQL DB password: ${DB_PASSWORD}"
echo ">>> Save this — you will need it in the environment config below."
echo ""

# ── 4. Install Nginx ─────────────────────────────────────────────────────────
apt-get install -y nginx
systemctl enable nginx

# ── 5. Install Certbot for SSL ───────────────────────────────────────────────
apt-get install -y certbot python3-certbot-nginx

# ── 6. Create app user and directories ──────────────────────────────────────
useradd -m -s /bin/bash wayside 2>/dev/null || true
mkdir -p /var/www/wayside
chown wayside:wayside /var/www/wayside

echo ""
echo "=== Base setup complete ==="
echo "Next steps:"
echo "  1. Upload app files to /var/www/wayside"
echo "  2. Edit /etc/wayside.env with your DB password and JWT key"
echo "  3. Copy deploy/wayside-api.service to /etc/systemd/system/"
echo "  4. Copy deploy/nginx.conf to /etc/nginx/sites-available/wayside"
echo "  5. Run: systemctl enable --now wayside-api"
echo "  6. Run: certbot --nginx -d yourdomain.co.za"

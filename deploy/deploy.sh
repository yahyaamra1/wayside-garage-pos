#!/bin/bash
# Run this locally to build and push a new release to the server
# Usage: bash deploy/deploy.sh user@your-server-ip
set -e

SERVER=$1
if [ -z "$SERVER" ]; then
  echo "Usage: bash deploy/deploy.sh user@your-server-ip"
  exit 1
fi

DEPLOY_PATH="/var/www/wayside"

echo "=== Building React frontend ==="
cd WaysideGarage.Client
npm run build
cd ..

echo "=== Publishing .NET API ==="
dotnet publish WaysideGarage.API \
  -c Release \
  -o ./publish \
  --self-contained false

echo "=== Copying React build into publish/wwwroot ==="
cp -r WaysideGarage.Client/dist ./publish/wwwroot

echo "=== Uploading to server ==="
rsync -avz --delete ./publish/ ${SERVER}:${DEPLOY_PATH}/

echo "=== Restarting service ==="
ssh ${SERVER} "systemctl restart wayside-api && systemctl status wayside-api --no-pager"

echo ""
echo "=== Deploy complete ==="

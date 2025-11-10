#!/usr/bin/env pwsh
# Production environment script
# Usage: .\prod.ps1 up -d --build

docker compose -f compose.yaml -f compose.prod.yaml $args

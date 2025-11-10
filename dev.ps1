#!/usr/bin/env pwsh
# Development environment script
# Usage: .\dev.ps1 up -d --build

docker compose -f compose.yaml -f compose.dev.yaml $args

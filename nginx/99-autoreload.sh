#!/bin/sh
# Script to automatically reload nginx configuration periodically
# This is useful for refreshing SSL certificates after they are renewed

while :; do
    # Sleep for 6 hours
    sleep 6h
    
    # Test nginx configuration before reloading
    nginx -t && nginx -s reload
    
    echo "[$(date)] Nginx configuration reloaded"
done &

#!/bin/bash

CON_NAME="wifi_auto"

# Prompt for credentials
read -p "Enter Wi-Fi SSID: " SSID
read -sp "Enter Wi-Fi Password: " PASSWORD
echo ""

if [ -z "$SSID" ] || [ -z "$PASSWORD" ]; then
    echo "Error: SSID and password are required."
    exit 1
fi

# Check if connection already exists
if nmcli connection show "$CON_NAME" >/dev/null 2>&1; then
    echo "Connection '$CON_NAME' already exists. Modifying credentials..."
    nmcli connection modify "$CON_NAME" 802-11-wireless.ssid "$SSID"
    nmcli connection modify "$CON_NAME" wifi-sec.psk "$PASSWORD"
    nmcli connection modify "$CON_NAME" connection.autoconnect yes
else
    echo "Creating new Wi-Fi connection '$CON_NAME'..."
    nmcli connection add type wifi ifname wlan0 con-name "$CON_NAME" ssid "$SSID"
    nmcli connection modify "$CON_NAME" wifi-sec.key-mgmt wpa-psk
    nmcli connection modify "$CON_NAME" wifi-sec.psk "$PASSWORD"
    nmcli connection modify "$CON_NAME" connection.autoconnect yes
fi

echo "Wi-Fi profile setup complete. It will auto-connect when '$SSID' is in range."

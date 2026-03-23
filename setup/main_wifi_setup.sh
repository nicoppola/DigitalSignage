#!/bin/bash

if [ "$EUID" -ne 0 ]; then
    echo "This script requires root privileges. Run with: sudo bash $0"
    exit 1
fi

read -p "Enter Wi-Fi SSID: " SSID
read -sp "Enter Wi-Fi password: " PASSWORD
echo
CON_NAME="wifi_auto"

# Check if connection already exists
if nmcli connection show "$CON_NAME" >/dev/null 2>&1; then
    echo "Connection '$CON_NAME' already exists. Modifying credentials..."
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

#!/bin/bash

# Replace these with your Wi-Fi credentials
SSID="ENTER_YOUR_SSID_HERE"
PASSWORD="ENTER_YOUR_PASSWORD_HERE"
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

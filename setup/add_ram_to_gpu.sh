#!/bin/bash

CONFIG_FILE="/boot/firmware/config.txt"
GPU_MEM="256"
VC4_OVERLAY="dtoverlay=vc4-kms-v3d"
VC6_OVERLAY="dtoverlay=vc6-kms-v3d"

echo "Updating $CONFIG_FILE ..."

# --- Ensure gpu_mem is set ---
if grep -q "^gpu_mem=" "$CONFIG_FILE"; then
    sudo sed -i "s/^gpu_mem=.*/gpu_mem=$GPU_MEM/" "$CONFIG_FILE"
    echo "✔ Updated gpu_mem to $GPU_MEM MB."
else
    echo "gpu_mem=$GPU_MEM" | sudo tee -a "$CONFIG_FILE" > /dev/null
    echo "✔ Added gpu_mem=$GPU_MEM."
fi

# --- Comment out vc4 overlay if present ---
if grep -q "^$VC4_OVERLAY" "$CONFIG_FILE"; then
    sudo sed -i "s/^$VC4_OVERLAY/# $VC4_OVERLAY/" "$CONFIG_FILE"
    echo "✔ Commented out vc4 overlay."
fi

# --- Ensure vc6 overlay exists ---
if grep -q "^$VC6_OVERLAY" "$CONFIG_FILE"; then
    echo "✔ vc6 overlay already present."
else
    echo "$VC6_OVERLAY" | sudo tee -a "$CONFIG_FILE" > /dev/null
    echo "✔ Added vc6 overlay."
fi

echo "Done! You should reboot for changes to take effect."


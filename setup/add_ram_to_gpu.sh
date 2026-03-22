#!/bin/bash

CONFIG_FILE="/boot/firmware/config.txt"

echo "Configuring GPU and memory settings in $CONFIG_FILE ..."

# Helper: set or add a config key=value
set_config() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$CONFIG_FILE"; then
    sudo sed -i "s/^${key}=.*/${key}=${value}/" "$CONFIG_FILE"
    echo "✔ Updated ${key} to ${value}."
  else
    echo "${key}=${value}" | sudo tee -a "$CONFIG_FILE" > /dev/null
    echo "✔ Added ${key}=${value}."
  fi
}

# Helper: set or add a dtparam
set_dtparam() {
  local param="$1"
  local value="$2"
  if grep -q "^dtparam=${param}=" "$CONFIG_FILE"; then
    sudo sed -i "s/^dtparam=${param}=.*/dtparam=${param}=${value}/" "$CONFIG_FILE"
    echo "✔ Updated dtparam ${param} to ${value}."
  else
    echo "dtparam=${param}=${value}" | sudo tee -a "$CONFIG_FILE" > /dev/null
    echo "✔ Added dtparam ${param}=${value}."
  fi
}

# Detect which KMS driver is active
KMS_ACTIVE=false
if grep -q "^dtoverlay=vc4-kms-v3d" "$CONFIG_FILE" || \
   grep -q "^dtoverlay=vc6-kms-v3d" "$CONFIG_FILE"; then
  KMS_ACTIVE=true
fi

if [ "$KMS_ACTIVE" = true ]; then
  echo "KMS driver detected — configuring CMA for hardware video decode."

  # With KMS, gpu_mem is largely ignored — set it low to avoid wasting reserved memory
  set_config "gpu_mem" "128"

  # CMA (Contiguous Memory Allocator) is what the KMS driver actually uses
  # for hardware video decode buffers. 256MB is generous for 720p/1080p decode.
  set_dtparam "cma-size" "256M"
else
  echo "No KMS driver detected — configuring legacy gpu_mem."
  set_config "gpu_mem" "256"
fi

# Detect Pi model and ensure the correct DRM/KMS overlay is set
PI_MODEL=$(tr -d '\0' < /proc/device-tree/model 2>/dev/null || echo "unknown")
echo "Detected Pi model: $PI_MODEL"

# vc4-kms-v3d is the stable, recommended overlay for Pi 4 and Pi 5
OVERLAY="vc4-kms-v3d"
VC6_OVERLAY="dtoverlay=vc6-kms-v3d"

# Comment out vc6 overlay if present (experimental, can cause issues)
if grep -q "^$VC6_OVERLAY" "$CONFIG_FILE"; then
  sudo sed -i "s/^$VC6_OVERLAY/# $VC6_OVERLAY/" "$CONFIG_FILE"
  echo "✔ Commented out vc6 overlay (experimental)."
fi

# Ensure vc4-kms-v3d overlay exists
if grep -q "^dtoverlay=$OVERLAY" "$CONFIG_FILE"; then
  echo "✔ $OVERLAY overlay already present."
else
  echo "dtoverlay=$OVERLAY" | sudo tee -a "$CONFIG_FILE" > /dev/null
  echo "✔ Added $OVERLAY overlay."
fi

echo ""
echo "Done! Reboot for changes to take effect."

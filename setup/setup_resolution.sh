#!/bin/bash

# Force HDMI output to 1080p
#
# The Pi 4 GPU cannot smoothly composite CSS transitions at 4K (3840x2160).
# Many 4K TVs advertise 4K as their "preferred" EDID mode, so the Pi defaults
# to it even though it can't handle it. The TV upscales 1080p just fine, so
# there's no visual downside to forcing 1080p output.
#
# This creates an Xorg config that overrides the EDID preferred mode.
# The autostart script also has an xrandr fallback as belt-and-suspenders.

XORG_DIR="/etc/X11/xorg.conf.d"
CONF_FILE="$XORG_DIR/10-resolution.conf"

echo "Configuring HDMI output resolution..."

mkdir -p "$XORG_DIR"

cat > "$CONF_FILE" << 'EOF'
Section "Monitor"
    Identifier "HDMI-1"
    Option "PreferredMode" "1920x1080"
EndSection
EOF

echo "✔ Created $CONF_FILE (forces 1080p output)"

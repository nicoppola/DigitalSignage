#!/bin/bash

while true; do
  clear

  TEMP=$(vcgencmd measure_temp | grep -oP '[0-9.]+')
  FREQ_RAW=$(vcgencmd measure_clock core | grep -oP '[0-9]+$')
  FREQ_MHZ=$((FREQ_RAW / 1000000))
  THROTTLE=$(vcgencmd get_throttled | cut -d= -f2)

  # Temperature status
  if (( $(echo "$TEMP >= 80" | bc -l) )); then
    TEMP_STATUS="THROTTLING"
  elif (( $(echo "$TEMP >= 75" | bc -l) )); then
    TEMP_STATUS="WARNING"
  elif (( $(echo "$TEMP >= 65" | bc -l) )); then
    TEMP_STATUS="WARM"
  else
    TEMP_STATUS="OK"
  fi

  # Frequency status
  if (( FREQ_MHZ >= 500 )); then
    FREQ_STATUS="FULL SPEED"
  elif (( FREQ_MHZ >= 400 )); then
    FREQ_STATUS="SLIGHTLY REDUCED"
  else
    FREQ_STATUS="THROTTLED"
  fi

  # Throttle status
  case $THROTTLE in
    0x0)     THROTTLE_STATUS="ALL GOOD" ;;
    0x50000) THROTTLE_STATUS="WAS THROTTLED (recovered)" ;;
    0x50005) THROTTLE_STATUS="UNDERVOLTAGE + THROTTLED" ;;
    0x80008) THROTTLE_STATUS="SOFT TEMP LIMIT" ;;
    *)       THROTTLE_STATUS="CHECK FLAGS: $THROTTLE" ;;
  esac

  echo "========================================="
  echo "   DIGITAL SIGNAGE - GPU MONITOR"
  echo "========================================="
  echo ""
  echo "  Temperature:  ${TEMP}°C    [${TEMP_STATUS}]"
  echo "  GPU Clock:    ${FREQ_MHZ} MHz   [${FREQ_STATUS}]"
  echo "  Throttled:    ${THROTTLE}       [${THROTTLE_STATUS}]"
  echo ""
  echo "========================================="
  echo "   CHEAT SHEET"
  echo "========================================="
  echo ""
  echo "  TEMPERATURE"
  echo "    < 65°C      OK - running cool"
  echo "    65-74°C     WARM - normal under load"
  echo "    75-79°C     WARNING - close to throttle"
  echo "    80°C+       THROTTLING - needs cooling"
  echo ""
  echo "  GPU CLOCK"
  echo "    500 MHz     Full speed (normal)"
  echo "    250 MHz     Throttled (performance hit)"
  echo ""
  echo "  THROTTLE FLAGS"
  echo "    0x0         All good"
  echo "    0x50000     Was throttled, now recovered"
  echo "    0x50005     Undervoltage + throttled"
  echo "    0x80008     Soft temp limit reached"
  echo ""
  echo "  Refreshing every 2s... (Ctrl+C to exit)"

  sleep 2
done

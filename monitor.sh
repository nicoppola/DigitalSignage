#!/bin/bash

# Live system monitor for the Pi
# Shows temperature, throttle status, and memory usage every second

watch -n 1 'vcgencmd measure_temp; vcgencmd get_throttled; free -h | head -2'

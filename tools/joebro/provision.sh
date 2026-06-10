#!/bin/bash
# JoeBro Web Controller - Wi-Fi Provisioning
# Written by Joe B. The Blind Hacker

echo -e "\033[0;36m=========================================\033[0m"
echo -e "\033[0;36m Sobro Smart Table - Wi-Fi Provisioning\033[0m"
echo -e "\033[0;36m=========================================\033[0m"
echo ""
echo -e "\033[0;33mBefore running this, ensure your computer is currently connected\033[0m"
echo -e "\033[0;33mto the 'Sobro_XXXX' Wi-Fi network broadcasted by the table.\033[0m"
echo ""

read -p "Enter your Home Wi-Fi Network Name (SSID) [2.4GHz ONLY]: " ssid
read -s -p "Enter your Home Wi-Fi Password: " password
echo ""
echo ""

echo -e "\033[0;32mProvisioning table to $ssid...\033[0m"

# Send to table via query string, safely urlencoded
curl -s -G -X POST \
  --data-urlencode "ssid=${ssid}" \
  --data-urlencode "key=${password}" \
  "http://192.168.0.1/wifi_connect.json" --max-time 10

if [ $? -eq 0 ]; then
    echo ""
    echo -e "\033[0;32mPayload sent successfully! The table should beep and reboot.\033[0m"
    echo "Please connect your computer back to your home Wi-Fi network."
else
    echo ""
    echo -e "\033[0;31mError connecting to the table. Make sure you are connected to the 'Sobro_XXXX' network!\033[0m"
fi
echo ""
exit 0

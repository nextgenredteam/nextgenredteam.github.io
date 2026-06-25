#!/usr/bin/env bash

# Event ID 4625 Trigger - Bash Implementation using smbclient
# Resolves settings in order: 1. CLI Flags, 2. Root/Local config.json, 3. Interactive Inputs

show_help() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -t, --target-ip IP       Target Windows IP, list, or CIDR block (e.g. 192.168.1.0/24)"
    echo "  -d, --domain DOMAIN      Target Domain or WORKGROUP (default: WORKGROUP)"
    echo "  -u, --username USER      Username for authentication attempt"
    echo "  -p, --password PASS      Incorrect password to trigger Event ID 4625"
    echo "  -i, --interval SEC       Interval in seconds between attempts (default: 5)"
    echo "  -c, --count NUM          Number of attempts to run (0 for infinite)"
    echo "  -h, --help               Show this help message"
}

# Parse command line flags
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -t|--target-ip) TARGET_IP="$2"; shift ;;
        -d|--domain) DOMAIN="$2"; shift ;;
        -u|--username) USERNAME="$2"; shift ;;
        -p|--password) INVALID_PASSWORD="$2"; shift ;;
        -i|--interval) INTERVAL="$2"; shift ;;
        -c|--count) COUNT="$2"; shift ;;
        -h|--help) show_help; exit 0 ;;
        *) echo "Unknown parameter: $1"; show_help; exit 1 ;;
    esac
    shift
done

# Check if smbclient is installed
if ! command -v smbclient &> /dev/null; then
    echo "WARNING: 'smbclient' is not installed. Authentication attempts might fail."
    echo "On Red Hat, install it with: sudo dnf install samba-client -y"
fi

# Fallback to config.json if values are empty
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILES=(
    "$SCRIPT_DIR/../config.json"
    "$SCRIPT_DIR/config.json"
    "../config.json"
    "./config.json"
    "config.json"
)
CONFIG_FOUND=""

for CFG in "${CONFIG_FILES[@]}"; do
    if [[ -f "$CFG" ]]; then
        CONFIG_FOUND="$CFG"
        break
    fi
done

read_json_val() {
    local key="$1"
    local file="$2"
    grep -Po '"'"$key"'"\s*:\s*"\K[^"]*' "$file" 2>/dev/null || \
    grep -Po '"'"$key"'"\s*:\s*\K[0-9]+' "$file" 2>/dev/null
}

if [[ -n "$CONFIG_FOUND" ]]; then
    CFG_VAL=$(read_json_val "target_ip" "$CONFIG_FOUND")
    [[ -z "$TARGET_IP" && -n "$CFG_VAL" ]] && TARGET_IP="$CFG_VAL"
    CFG_VAL=$(read_json_val "domain" "$CONFIG_FOUND")
    [[ -z "$DOMAIN" && -n "$CFG_VAL" ]] && DOMAIN="$CFG_VAL"
    CFG_VAL=$(read_json_val "username" "$CONFIG_FOUND")
    [[ -z "$USERNAME" && -n "$CFG_VAL" ]] && USERNAME="$CFG_VAL"
    CFG_VAL=$(read_json_val "invalid_password" "$CONFIG_FOUND")
    [[ -z "$INVALID_PASSWORD" && -n "$CFG_VAL" ]] && INVALID_PASSWORD="$CFG_VAL"
    CFG_VAL=$(read_json_val "interval" "$CONFIG_FOUND")
    [[ -z "$INTERVAL" && -n "$CFG_VAL" ]] && INTERVAL="$CFG_VAL"
    CFG_VAL=$(read_json_val "count" "$CONFIG_FOUND")
    [[ -z "$COUNT" && -n "$CFG_VAL" ]] && COUNT="$CFG_VAL"
fi

# Fallback to interactive mode if still missing
if [[ -z "$TARGET_IP" ]]; then
    read -p "Enter Target Windows IP/List/CIDR: " TARGET_IP
fi
if [[ -z "$DOMAIN" ]]; then
    read -p "Enter Target Domain/WORKGROUP [WORKGROUP]: " DOMAIN
    DOMAIN=${DOMAIN:-WORKGROUP}
fi
if [[ -z "$USERNAME" ]]; then
    read -p "Enter Target Username: " USERNAME
fi
if [[ -z "$INVALID_PASSWORD" ]]; then
    read -p "Enter Invalid Password (to fail auth): " INVALID_PASSWORD
fi
if [[ -z "$INTERVAL" ]]; then
    read -p "Enter Interval between attempts (seconds) [5]: " INTERVAL
    INTERVAL=${INTERVAL:-5}
fi
if [[ -z "$COUNT" ]]; then
    read -p "Enter run count (0 for infinite) [3]: " COUNT
    COUNT=${COUNT:-3}
fi

# Pure Bash CIDR expansion
expand_cidr() {
    local cidr="$1"
    local ip=$(echo "$cidr" | cut -d/ -f1)
    local mask=$(echo "$cidr" | cut -d/ -f2)
    
    IFS=. read -r i1 i2 i3 i4 <<< "$ip"
    local ip_num=$(( (i1 << 24) + (i2 << 16) + (i3 << 8) + i4 ))
    
    local host_bits=$(( 32 - mask ))
    local num_hosts=$(( 1 << host_bits ))
    
    local mask_num=$(( -1 << host_bits ))
    local net_num=$(( ip_num & mask_num ))
    
    local start=1
    local end=$(( num_hosts - 1 ))
    if [[ $mask -ge 31 ]]; then
        start=0
        end=$num_hosts
    fi
    
    for (( i=start; i < end; i++ )); do
        local addr=$(( net_num + i ))
        local o1=$(( (addr >> 24) & 255 ))
        local o2=$(( (addr >> 16) & 255 ))
        local o3=$(( (addr >> 8) & 255 ))
        local o4=$(( addr & 255 ))
        echo "$o1.$o2.$o3.$o4"
    done
}

# Target parser (resolves commas and CIDRs)
parse_targets() {
    local target_string="$1"
    local expanded=()
    IFS=',' read -ra PARTS <<< "$target_string"
    for part in "${PARTS[@]}"; do
        part=$(echo "$part" | xargs)
        if [[ "$part" == *"/"* ]]; then
            while read -r ip; do
                expanded+=("$ip")
            done < <(expand_cidr "$part")
        else
            expanded+=("$part")
        fi
    done
    echo "${expanded[@]}"
}

TARGETS=($(parse_targets "$TARGET_IP"))

echo "=============================================="
echo "Starting Event ID 4625 Emulation Loop (Bash)"
echo "Targets  : ${TARGETS[*]}"
echo "Domain   : $DOMAIN"
echo "Username : $USERNAME"
echo "Password : [REDACTED]"
echo "Interval : $INTERVAL seconds"
echo "Count    : $( [[ "$COUNT" -eq 0 ]] && echo "Infinite (Press Ctrl+C to terminate)" || echo "$COUNT" )"
echo "=============================================="

trigger_smb_attempt() {
    local target="$1"
    local output=""
    
    output=$(echo "$INVALID_PASSWORD" | smbclient "//$target/IPC$" -U "$USERNAME" -W "$DOMAIN" 2>&1)
    
    if echo "$output" | grep -E -q "LOGON_FAILURE|ACCESS_DENIED|NT_STATUS_UNSUCCESSFUL"; then
        return 0
    else
        echo "  [INFO] Request sent to $target. Response was:"
        echo "  $output" | head -n 2
        return 1
    fi
}

ITERATION=0
while true; do
    for target in "${TARGETS[@]}"; do
        ITERATION=$((ITERATION + 1))
        
        if [[ "$COUNT" -ne 0 && "$ITERATION" -gt "$COUNT" ]]; then
            echo "Completed requested $COUNT attempts. Exiting."
            break 2
        fi
        
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Attempt #$ITERATION: Sending failed SMB authentication to $target..."
        
        if trigger_smb_attempt "$target"; then
            echo "  [SUCCESS] Triggered Logon Failure status (Event ID 4625 generated on target)."
        fi
        
        if [[ "$COUNT" -eq 0 || "$ITERATION" -lt "$COUNT" ]]; then
            sleep "$INTERVAL"
        fi
    done
    
    if [[ "$COUNT" -ne 0 ]]; then
        break
    fi
done

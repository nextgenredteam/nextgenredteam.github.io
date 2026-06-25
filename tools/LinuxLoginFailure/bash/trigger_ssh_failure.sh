#!/usr/bin/env bash

# Linux SSH Login Failure Emulator - Bash Implementation
# Resolves settings in order: 1. CLI Flags, 2. Root/Local config.json, 3. Interactive Inputs

show_help() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -t, --target-ip IP       Target IP, comma-separated list, or CIDR block (e.g. 192.168.1.0/24)"
    echo "  -P, --port PORT          Target SSH port (default: 22)"
    echo "  -u, --username USER      Username for authentication attempt"
    echo "  -p, --password PASS      Incorrect password to trigger authentication failure"
    echo "  -i, --interval SEC       Interval in seconds between attempts (default: 5)"
    echo "  -c, --count NUM          Number of attempts to run (0 for infinite)"
    echo "  -h, --help               Show this help message"
}

# Parse command line flags
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -t|--target-ip) TARGET_IP="$2"; shift ;;
        -P|--port) PORT="$2"; shift ;;
        -u|--username) USERNAME="$2"; shift ;;
        -p|--password) INVALID_PASSWORD="$2"; shift ;;
        -i|--interval) INTERVAL="$2"; shift ;;
        -c|--count) COUNT="$2"; shift ;;
        -h|--help) show_help; exit 0 ;;
        *) echo "Unknown parameter: $1"; show_help; exit 1 ;;
    esac
    shift
done

# Check if ssh is installed
if ! command -v ssh &> /dev/null; then
    echo "WARNING: 'ssh' command line client is not installed. Authentication attempts will fail."
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
    CFG_VAL=$(read_json_val "port" "$CONFIG_FOUND")
    [[ -z "$PORT" && -n "$CFG_VAL" ]] && PORT="$CFG_VAL"
    CFG_VAL=$(read_json_val "username" "$CONFIG_FOUND")
    [[ -z "$USERNAME" && -n "$CFG_VAL" ]] && USERNAME="$CFG_VAL"
    CFG_VAL=$(read_json_val "invalid_password" "$CONFIG_FOUND")
    [[ -z "$INVALID_PASSWORD" && -n "$CFG_VAL" ]] && INVALID_PASSWORD="$CFG_VAL"
    CFG_VAL=$(read_json_val "interval" "$CONFIG_FOUND")
    [[ -z "$INTERVAL" && -n "$CFG_VAL" ]] && INTERVAL="$CFG_VAL"
    CFG_VAL=$(read_json_val "count" "$CONFIG_FOUND")
    [[ -z "$COUNT" && -n "$CFG_VAL" ]] && COUNT="$CFG_VAL"
    AUTH_METHOD=$(read_json_val "auth_method" "$CONFIG_FOUND")
    INVALID_KEY_DATA=$(read_json_val "invalid_key_data" "$CONFIG_FOUND")
fi

# Apply defaults
[[ -z "$TARGET_IP" ]] && TARGET_IP="192.168.1.100"
[[ -z "$PORT" ]] && PORT=22
[[ -z "$USERNAME" ]] && USERNAME="root"
[[ -z "$INVALID_PASSWORD" ]] && INVALID_PASSWORD="WrongPassword123!"
[[ -z "$INTERVAL" ]] && INTERVAL=5
[[ -z "$COUNT" ]] && COUNT=3
AUTH_METHOD=${AUTH_METHOD:-password}
[[ -z "$INVALID_KEY_DATA" ]] && INVALID_KEY_DATA="-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn\nNhAAAAAwEAAQAAAQEAvzHebtagLlVilTyFiQKpW3jZnKj7+nq2Zv/piovsgLiawHBiVjpI\nOp/Cs2z5mTzR1PCWuPxMcACJZtCGfnEs9sVZNj6ppacSq28mu20uBA0n6CluMaEWICqiED\ngLcdn/LA8OtsNi170JzJbgB2H0kJwshD5kriENtPlrKaR3KdXlIOGhe4Qo/i8BQwubiIOV\npFTNAy4xkRL5ojT835sI61Wlp1pZpLb43aLYbYV8UDEj/ciojkQ6AlrDZI3G5NPdV98Q9C\nXduC9axw85Wxb7l9An2sCDxRycbo0yXQqOEq47LtjTuJ7jA/jupwGGOqjSoFZ8VLz0Zpg7\n60dJGRqPsQAAA9DVwaoh1cGqIQAAAAdzc2gtcnNhAAABAQC/Md5u1qAuVWKVPIWJAqlbeN\nmcqPv6erZm/+mKi+yAuJrAcGJWOkg6n8KzbPmZPNHU8Ja4/ExwAIlm0IZ+cSz2xVk2Pqml\npxKrbya7bS4EDSfoKW4xoRYgKqIQOAtx2f8sDw62w2LXvQnMluAHYfSQnCyEPmSuIQ20+W\nsppHcp1eUg4aF7hCj+LwFDC5uIg5WkVM0DLjGREvmiNPzfmwjrVaWnWlmktvjdoththXxQ\nMSP9yKiORDoCWsNkjcbk091X3xD0Jd24L1rHDzlbFvuX0CfawIPFHJxujTJdCo4Srjsu2N\nO4nuMD+O6nAYY6qNKgVnxUvPRmmDvrR0kZGo+xAAAAAwEAAQAAAQEAsCclFZ+eszGuA2tg\naKxQFtvQOtsiVVOMDHfJ1wE15B6xTY39vA40j/azrxY/HOUBOpxzcXnafvKvpU+IKqThVX\nbby/ON3/Z/Z/2fhN2BoO/yDZ9mTElrFjXRXPoV6U59ID27Q73eqoAbsChtvb+NUVLiXPET\nV69SbqPCDPrfY2V5eEceE+jir69y8vnd9AkkkYbFG0HI9lHQyoAiaWfISb3HbX0PFKAYos\n1RYYurAhx6UI7w5t+rwLMiRDN3giK7t/tSB+ylGes29YVpkze32FONCc8QqWgVZBmIxgUs\nowAr0XaqdZGaJ2rQtRd+YIXLpKCkmtwNeLsgT/uwMH/wAQAAAIEA70UZJhVvna8mqx30rk\nd5o9gH0FY/dD0lP3aH3wKXlJss1BjmrgrwL5hxG6cKC5hOlU75s7RiFXUq4gpv6Pw41jEk\ndtK/t+snGyp4emnp0w61zGfjtZcgmikv+M1o4EUx1ihjR0Rrrl0n5DqwxLE4SLPaKFi0uP\n4iznPWhjI2muUAAACBAPbZfpXIYl/MSbC6jx+h4nCflrH4bN8KQ7lEBBWBfw3LhAA3i/N8\n6GPosQ8EKKi63KJGrN2g/cTo/Pj+RI8Df33iR8nOwT0aai7yEM66dBgKNLGwneAyHXoCX0\n3xKBROeQdBBz494v4gjx4gHbsp8FTceT1Jl7rINSYKLbjw+w6xAAAAgQDGSDt7rxmidUtd\n5SAeAgfQ4MIqJNR+WjZwF+i7Ic+S1ksCGXY36w4O5pjt7u1TzXdsZc5ffQAIWRtvPUjZxJ\n30SuNX1j81EqIXk1xqXKjCupbbDVE8ajyevmr7uIBV45QY+n0+NSE7z721yHK4s/IjbD6V\n58Dj3uwCAL7MRXHRAQAAABZicmlua0BERVNLVE9QLUpPRVVST0NLAQID\n-----END OPENSSH PRIVATE KEY-----"

# Fallback to interactive mode if still missing
if [[ -z "$TARGET_IP" ]]; then
    read -p "Enter Target Linux IP/List/CIDR: " TARGET_IP
fi
if [[ -z "$PORT" ]]; then
    read -p "Enter Target SSH Port [22]: " PORT
    PORT=${PORT:-22}
fi
if [[ -z "$USERNAME" ]]; then
    read -p "Enter Target Username: " USERNAME
fi
if [[ -z "$INVALID_PASSWORD" && "$AUTH_METHOD" == "password" ]]; then
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
echo "Starting SSH Login Failure Emulation Loop (Bash)"
echo "Targets  : ${TARGETS[*]}"
echo "Port     : $PORT"
echo "Username : $USERNAME"
echo "Password : [REDACTED]"
echo "Auth Mode: $AUTH_METHOD"
echo "Interval : $INTERVAL seconds"
echo "Count    : $( [[ "$COUNT" -eq 0 ]] && echo "Infinite (Press Ctrl+C to terminate)" || echo "$COUNT" )"
echo "=============================================="

# Helper function to trigger SSH logon failure
trigger_ssh_attempt() {
    local target="$1"
    local output=""
    local ret_code=0
    
    if [[ "$AUTH_METHOD" == "publickey" ]]; then
        # Key-based authentication failure simulation
        local key_file
        key_file=$(mktemp)
        echo -e "$INVALID_KEY_DATA" > "$key_file"
        chmod 600 "$key_file"
        
        output=$(ssh -p "$PORT" -i "$key_file" \
            -o StrictHostKeyChecking=no \
            -o PreferredAuthentications=publickey \
            -o PubkeyAuthentication=yes \
            -o NumberOfPasswordPrompts=0 \
            -o ConnectTimeout=3 \
            "$USERNAME@$target" true 2>&1)
        ret_code=$?
        rm -f "$key_file"
    else
        # Password-based authentication failure simulation
        if command -v sshpass &> /dev/null; then
            output=$(sshpass -p "$INVALID_PASSWORD" ssh -p "$PORT" \
                -o StrictHostKeyChecking=no \
                -o PreferredAuthentications=password \
                -o PubkeyAuthentication=no \
                -o NumberOfPasswordPrompts=1 \
                -o ConnectTimeout=3 \
                "$USERNAME@$target" true 2>&1)
            ret_code=$?
        else
            local askpass_script
            askpass_script=$(mktemp)
            echo '#!/usr/bin/env bash' > "$askpass_script"
            echo 'echo "'"$INVALID_PASSWORD"'"' >> "$askpass_script"
            chmod +x "$askpass_script"
            
            export SSH_ASKPASS="$askpass_script"
            export SSH_ASKPASS_REQUIRE=force
            export DISPLAY=:0
            
            output=$(ssh -p "$PORT" \
                -o StrictHostKeyChecking=no \
                -o PreferredAuthentications=password \
                -o PubkeyAuthentication=no \
                -o NumberOfPasswordPrompts=1 \
                -o ConnectTimeout=3 \
                "$USERNAME@$target" true 2>&1 < /dev/null)
            ret_code=$?
            
            rm -f "$askpass_script"
        fi
    fi
    
    # Check for authentication failure patterns in ssh output
    if echo "$output" | grep -E -iq "Permission denied|Keyboard-interactive|Authentication failed|Connection closed by authenticating|Connection closed by.*preauth"; then
        return 0 # Success in generating login failure
    else
        if [[ $ret_code -eq 0 ]]; then
            echo "  [WARNING] Established SSH session successfully to $target! (Verify if credentials are correct)"
            return 1
        fi
        echo "  [INFO] Connection or auth attempt completed."
        echo "  SSH Response: $(echo "$output" | tr -d '\r\n' | cut -c1-100)"
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
        
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Attempt #$ITERATION: Sending failed SSH authentication to $target:$PORT..."
        
        if trigger_ssh_attempt "$target"; then
            echo "  [SUCCESS] Triggered SSH Login Failure status (auth failure log generated on target)."
        fi
        
        if [[ "$COUNT" -eq 0 || "$ITERATION" -lt "$COUNT" ]]; then
            sleep "$INTERVAL"
        fi
    done
    
    if [[ "$COUNT" -ne 0 ]]; then
        break
    fi
done

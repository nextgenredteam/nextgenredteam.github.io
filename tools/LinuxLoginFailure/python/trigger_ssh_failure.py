#!/usr/bin/env python3
import os
import sys
import json
import time
import argparse
import tempfile
import subprocess

# Linux SSH Login Failure Emulator - Python Implementation
# Resolves settings in order: 1. CLI Flags, 2. Root/Local config.json, 3. Interactive Inputs

def trigger_via_paramiko(target, port, username, password, auth_method="password", key_data=None):
    try:
        import paramiko
        import io
    except ImportError:
        return None  # Paramiko not installed
        
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        if auth_method == "publickey" and key_data:
            key_file_obj = io.StringIO(key_data)
            try:
                pkey = paramiko.RSAKey.from_private_key(key_file_obj)
            except Exception:
                try:
                    pkey = paramiko.Ed25519Key.from_private_key(key_file_obj)
                except Exception as e:
                    print(f"  [ERROR] Private key parse error: {e}. Falling back to password.")
                    pkey = None
            
            if pkey:
                client.connect(
                    hostname=target,
                    port=port,
                    username=username,
                    pkey=pkey,
                    timeout=3.0,
                    allow_agent=False,
                    look_for_keys=False
                )
                print(f"  [WARNING] Established SSH session successfully to {target}! (Verify if credentials are correct)")
                client.close()
                return False
                
        # Password authentication fallback or direct password auth
        client.connect(
            hostname=target,
            port=port,
            username=username,
            password=password,
            timeout=3.0,
            allow_agent=False,
            look_for_keys=False
        )
        print(f"  [WARNING] Established SSH session successfully to {target}! (Verify if credentials are correct)")
        client.close()
        return False
    except paramiko.AuthenticationException:
        return True
    except Exception as e:
        print(f"  [INFO] Attempt completed. Paramiko response: {e}")
        return False

def trigger_via_ssh_askpass(target, port, username, password, auth_method="password", key_data=None):
    is_windows = os.name == "nt"
    temp_path = None
    temp_key_path = None
    
    # Create temp key if authentication is key-based
    if auth_method == "publickey" and key_data:
        try:
            fd, temp_key_path = tempfile.mkstemp(suffix=".key", text=True)
            with os.fdopen(fd, "w") as f:
                f.write(key_data)
            
            # Restrict permissions (600 in unix, equivalent restricted ACL in windows)
            if is_windows:
                subprocess.run(
                    ["icacls", temp_key_path, "/inheritance:r", "/grant:r", f"{os.getlogin()}:(R,W)"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            else:
                os.chmod(temp_key_path, 0o600)
        except Exception as e:
            print(f"  [ERROR] Failed to write temp key file: {e}")
            return False
            
    # Create temp script to act as the password provider for ssh
    if auth_method == "password":
        try:
            if is_windows:
                fd, temp_path = tempfile.mkstemp(suffix=".bat", text=True)
                with os.fdopen(fd, "w") as f:
                    f.write(f"@echo off\necho {password}\n")
            else:
                fd, temp_path = tempfile.mkstemp(suffix=".sh", text=True)
                with os.fdopen(fd, "w") as f:
                    f.write(f"#!/bin/sh\necho '{password}'\n")
                os.chmod(temp_path, 0o700)
        except Exception as e:
            print(f"  [ERROR] Failed to create askpass helper: {e}")
            if temp_key_path and os.path.exists(temp_key_path):
                os.unlink(temp_key_path)
            return False
        
    try:
        env = os.environ.copy()
        if temp_path:
            env["SSH_ASKPASS"] = temp_path
            env["SSH_ASKPASS_REQUIRE"] = "force"
            env["DISPLAY"] = ":0"
        
        cmd = [
            "ssh",
            "-p", str(port),
            "-o", "StrictHostKeyChecking=no",
            "-o", "PubkeyAuthentication=" + ("yes" if auth_method == "publickey" else "no"),
            "-o", "PreferredAuthentications=" + auth_method,
            "-o", "NumberOfPasswordPrompts=" + ("0" if auth_method == "publickey" else "1"),
            "-o", "ConnectTimeout=3"
        ]
        
        if auth_method == "publickey" and temp_key_path:
            cmd.extend(["-i", temp_key_path])
            
        cmd.extend([f"{username}@{target}", "true"])
        
        proc = subprocess.Popen(
            cmd,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = proc.communicate()
        output = (stdout + stderr).decode("utf-8", errors="ignore")
        
        # Check authentication failure signatures
        if "Permission denied" in output or "Keyboard-interactive" in output or "Connection closed" in output or proc.returncode == 255:
            # Differentiate connection refused from authentic auth failure
            if "connection refused" in output.lower() or "timeout" in output.lower():
                clean_err = output.strip().replace('\r', '').replace('\n', ' ')[:100]
                print(f"  [ERROR] Connection failed: {clean_err}")
                return False
            return True
        elif proc.returncode == 0:
            print(f"  [WARNING] Established SSH session successfully to {target}! (Verify if credentials are correct)")
            return False
        else:
            clean_output = output.strip().replace('\r', '').replace('\n', ' ')[:100]
            print(f"  [INFO] Connection completed. SSH Output: {clean_output}")
            return False
    except FileNotFoundError:
        print("  [ERROR] 'ssh' executable not found in PATH.")
        return False
    except Exception as e:
        print(f"  [ERROR] SSH execution failed: {e}")
        return False
    finally:
        for path in [temp_path, temp_key_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass

def parse_targets(target_string):
    import ipaddress
    targets = []
    for part in target_string.split(','):
        part = part.strip()
        if '/' in part:
            try:
                network = ipaddress.ip_network(part, strict=False)
                hosts = list(network.hosts())
                if not hosts:
                    targets.extend([str(ip) for ip in network])
                else:
                    targets.extend([str(ip) for ip in hosts])
            except Exception:
                targets.append(part)
        elif part:
            targets.append(part)
    return targets

def main():
    parser = argparse.ArgumentParser(description="Linux SSH Logon Failure Emulation Utility")
    parser.add_argument("-t", "--target", help="Target Linux Host IP, list, or CIDR block")
    parser.add_argument("-P", "--port", type=int, help="Target SSH Port (default: 22)")
    parser.add_argument("-u", "--user", help="Username")
    parser.add_argument("-p", "--password", help="Invalid Password")
    parser.add_argument("-i", "--interval", type=int, help="Interval in seconds")
    parser.add_argument("-c", "--count", type=int, help="Count")
    args = parser.parse_args()

    # Fallback paths for config.json
    config = {
        "target_ip": "192.168.1.100",
        "port": 22,
        "username": "root",
        "invalid_password": "WrongPassword123!",
        "auth_method": "password",
        "invalid_key_data": "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn\nNhAAAAAwEAAQAAAQEAvzHebtagLlVilTyFiQKpW3jZnKj7+nq2Zv/piovsgLiawHBiVjpI\nOp/Cs2z5mTzR1PCWuPxMcACJZtCGfnEs9sVZNj6ppacSq28mu20uBA0n6CluMaEWICqiED\ngLcdn/LA8OtsNi170JzJbgB2H0kJwshD5kriENtPlrKaR3KdXlIOGhe4Qo/i8BQwubiIOV\npFTNAy4xkRL5ojT835sI61Wlp1pZpLb43aLYbYV8UDEj/ciojkQ6AlrDZI3G5NPdV98Q9C\nXduC9axw85Wxb7l9An2sCDxRycbo0yXQqOEq47LtjTuJ7jA/jupwGGOqjSoFZ8VLz0Zpg7\n60dJGRqPsQAAA9DVwaoh1cGqIQAAAAdzc2gtcnNhAAABAQC/Md5u1qAuVWKVPIWJAqlbeN\nmcqPv6erZm/+mKi+yAuJrAcGJWOkg6n8KzbPmZPNHU8Ja4/ExwAIlm0IZ+cSz2xVk2Pqml\npxKrbya7bS4EDSfoKW4xoRYgKqIQOAtx2f8sDw62w2LXvQnMluAHYfSQnCyEPmSuIQ20+W\nsppHcp1eUg4aF7hCj+LwFDC5uIg5WkVM0DLjGREvmiNPzfmwjrVaWnWlmktvjdoththXxQ\nMSP9yKiORDoCWsNkjcbk091X3xD0Jd24L1rHDzlbFvuX0CfawIPFHJxujTJdCo4Srjsu2N\nO4nuMD+O6nAYY6qNKgVnxUvPRmmDvrR0kZGo+xAAAAAwEAAQAAAQEAsCclFZ+eszGuA2tg\naKxQFtvQOtsiVVOMDHfJ1wE15B6xTY39vA40j/azrxY/HOUBOpxzcXnafvKvpU+IKqThVX\nbby/ON3/Z/Z/2fhN2BoO/yDZ9mTElrFjXRXPoV6U59ID27Q73eqoAbsChtvb+NUVLiXPET\nV69SbqPCDPrfY2V5eEceE+jir69y8vnd9AkkkYbFG0HI9lHQyoAiaWfISb3HbX0PFKAYos\n1RYYurAhx6UI7w5t+rwLMiRDN3giK7t/tSB+ylGes29YVpkze32FONCc8QqWgVZBmIxgUs\nowAr0XaqdZGaJ2rQtRd+YIXLpKCkmtwNeLsgT/uwMH/wAQAAAIEA70UZJhVvna8mqx30rk\nd5o9gH0FY/dD0lP3aH3wKXlJss1BjmrgrwL5hxG6cKC5hOlU75s7RiFXUq4gpv6Pw41jEk\ndtK/t+snGyp4emnp0w61zGfjtZcgmikv+M1o4EUx1ihjR0Rrrl0n5DqwxLE4SLPaKFi0uP\n4iznPWhjI2muUAAACBAPbZfpXIYl/MSbC6jx+h4nCflrH4bN8KQ7lEBBWBfw3LhAA3i/N8\n6GPosQ8EKKi63KJGrN2g/cTo/Pj+RI8Df33iR8nOwT0aai7yEM66dBgKNLGwneAyHXoCX0\n3xKBROeQdBBz494v4gjx4gHbsp8FTceT1Jl7rINSYKLbjw+w6xAAAAgQDGSDt7rxmidUtd\n5SAeAgfQ4MIqJNR+WjZwF+i7Ic+S1ksCGXY36w4O5pjt7u1TzXdsZc5ffQAIWRtvPUjZxJ\n30SuNX1j81EqIXk1xqXKjCupbbDVE8ajyevmr7uIBV45QY+n0+NSE7z721yHK4s/IjbD6V\n58Dj3uwCAL7MRXHRAQAAABZicmlua0BERVNLVE9QLUpPRVVST0NLAQID\n-----END OPENSSH PRIVATE KEY-----",
        "interval": 5,
        "count": 3
    }
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_paths = [
        os.path.join(script_dir, "..", "config.json"),
        os.path.join(script_dir, "config.json"),
        "../config.json",
        "./config.json",
        "config.json"
    ]
    for p in config_paths:
        if os.path.exists(p):
            try:
                with open(p, "r") as f:
                    config.update(json.load(f))
                break
            except Exception:
                pass

    # Resolve settings (CLI flags override config.json / hardcoded defaults)
    target_ip = args.target or config.get("target_ip")
    port = args.port or config.get("port")
    username = args.user or config.get("username")
    invalid_password = args.password or config.get("invalid_password")
    
    interval = args.interval if args.interval is not None else config.get("interval", 5)
    count = args.count if args.count is not None else config.get("count", 3)

    auth_method = config.get("auth_method", "password")
    invalid_key_data = config.get("invalid_key_data")

    # Prompt interactive if needed
    if not target_ip:
        target_ip = input("Enter Target Linux IP/List/CIDR: ").strip()
    if port is None:
        val = input("Enter Target SSH Port [22]: ").strip()
        port = int(val) if val else 22
    if not username:
        username = input("Enter Target Username: ").strip()
    if not invalid_password and auth_method == "password":
        invalid_password = input("Enter Invalid Password (to fail auth): ").strip()
    if interval is None:
        val = input("Enter Interval between attempts (seconds) [5]: ").strip()
        interval = int(val) if val else 5
    if count is None:
        val = input("Enter run count (0 for infinite) [3]: ").strip()
        count = int(val) if val else 3

    targets = parse_targets(target_ip)

    print("==============================================")
    print("Starting SSH Logon Failure Emulation Loop (Python)")
    print(f"Targets  : {', '.join(targets)}")
    print(f"Port     : {port}")
    print(f"Username : {username}")
    print(f"Password : [REDACTED]")
    print(f"Auth Mode: {auth_method}")
    print(f"Interval : {interval} seconds")
    print(f"Count    : {'Infinite (Press Ctrl+C to terminate)' if count == 0 else count}")
    print("==============================================")

    # Check for paramiko
    has_paramiko = False
    try:
        import paramiko
        has_paramiko = True
    except ImportError:
        pass

    iteration = 0
    while True:
        for target in targets:
            iteration += 1
            if count != 0 and iteration > count:
                print(f"Completed requested {count} attempts. Exiting.")
                return

            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Attempt #{iteration}: Sending failed SSH authentication to {target}:{port}...")

            success = False
            if has_paramiko:
                success = trigger_via_paramiko(target, port, username, invalid_password, auth_method, invalid_key_data)
            else:
                success = trigger_via_ssh_askpass(target, port, username, invalid_password, auth_method, invalid_key_data)

            if success:
                print("  [SUCCESS] Triggered SSH Logon Failure status (auth failure log generated on target).")
            else:
                print("  [INFO] Attempt completed.")

            if count == 0 or iteration < count:
                time.sleep(interval)
        
        if count != 0:
            break


if __name__ == "__main__":
    main()

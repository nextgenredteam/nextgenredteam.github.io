import os
import sys
import paramiko

def load_env(env_path=".env"):
    """
    Safely loads environment variables from a .env file without external dependencies.
    """
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                parts = line.split('=', 1)
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip()
                    # Strip quotes if present
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    # Only set if not already set in environment
                    if key not in os.environ:
                        os.environ[key] = val

def get_env_or_default(key, default=None):
    return os.environ.get(key, default)

def get_required_env(key):
    val = os.environ.get(key)
    if not val:
        print(f"[-] Configuration Error: Required variable '{key}' is missing.")
        print("    Please create a .env file or export the variable into your shell.")
        sys.exit(1)
    return val

def get_ssh_client(host, user, key_path=None, password=None, timeout=15):
    """
    Establishes a secure SSH connection using paramiko with explicit timeout.
    """
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        if key_path and os.path.exists(key_path):
            client.connect(host, port=22, username=user, key_filename=key_path, timeout=timeout)
        elif password:
            client.connect(host, port=22, username=user, password=password, timeout=timeout)
        else:
            client.connect(host, port=22, username=user, timeout=timeout)
        return client
    except Exception as e:
        print(f"[-] SSH Connection failed to {user}@{host}: {e}")
        sys.exit(1)

package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

// Config holds target details
type Config struct {
	TargetIP        string `json:"target_ip"`
	Port            int    `json:"port"`
	Username        string `json:"username"`
	InvalidPassword string `json:"invalid_password"`
	Interval        int    `json:"interval"`
	Count           int    `json:"count"`
	AuthMethod      string `json:"auth_method"`
	InvalidKeyData  string `json:"invalid_key_data"`
}

func readInput(prompt string) string {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print(prompt)
	text, _ := reader.ReadString('\n')
	return strings.TrimSpace(text)
}

func inc(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}

// CIDR and list parsing logic
func parseTargets(targetStr string) []string {
	var targets []string
	parts := strings.Split(targetStr, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if strings.Contains(part, "/") {
			ip, ipnet, err := net.ParseCIDR(part)
			if err == nil {
				// Loop through all IPs in the CIDR block
				for ip := ip.Mask(ipnet.Mask); ipnet.Contains(ip); inc(ip) {
					targets = append(targets, ip.String())
				}
				// Remove network and broadcast IPs for subnets smaller than /31
				ones, bits := ipnet.Mask.Size()
				if bits-ones > 1 && len(targets) > 2 {
					targets = targets[1 : len(targets)-1]
				}
			} else {
				targets = append(targets, part)
			}
		} else if part != "" {
			targets = append(targets, part)
		}
	}
	return targets
}

func main() {
	// Command line flags
	targetFlag := flag.String("t", "", "Target Linux IP, list, or CIDR block")
	portFlag := flag.Int("P", 0, "Target SSH port (default: 22)")
	userFlag := flag.String("u", "", "Target Username")
	passFlag := flag.String("p", "", "Invalid Password to fail authentication")
	intervalFlag := flag.Int("i", -1, "Interval in seconds between attempts")
	countFlag := flag.Int("c", -1, "Number of attempts to run (0 for infinite)")
	flag.Parse()

	var config Config

	// Initialize default hardcoded config
	config.TargetIP = "192.168.1.100"
	config.Port = 22
	config.Username = "root"
	config.InvalidPassword = "WrongPassword123!"
	config.Interval = 5
	config.Count = 3
	config.AuthMethod = "password"
	config.InvalidKeyData = "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn\nNhAAAAAwEAAQAAAQEAvzHebtagLlVilTyFiQKpW3jZnKj7+nq2Zv/piovsgLiawHBiVjpI\nOp/Cs2z5mTzR1PCWuPxMcACJZtCGfnEs9sVZNj6ppacSq28mu20uBA0n6CluMaEWICqiED\ngLcdn/LA8OtsNi170JzJbgB2H0kJwshD5kriENtPlrKaR3KdXlIOGhe4Qo/i8BQwubiIOV\npFTNAy4xkRL5ojT835sI61Wlp1pZpLb43aLYbYV8UDEj/ciojkQ6AlrDZI3G5NPdV98Q9C\nXduC9axw85Wxb7l9An2sCDxRycbo0yXQqOEq47LtjTuJ7jA/jupwGGOqjSoFZ8VLz0Zpg7\n60dJGRqPsQAAA9DVwaoh1cGqIQAAAAdzc2gtcnNhAAABAQC/Md5u1qAuVWKVPIWJAqlbeN\nmcqPv6erZm/+mKi+yAuJrAcGJWOkg6n8KzbPmZPNHU8Ja4/ExwAIlm0IZ+cSz2xVk2Pqml\npxKrbya7bS4EDSfoKW4xoRYgKqIQOAtx2f8sDw62w2LXvQnMluAHYfSQnCyEPmSuIQ20+W\nsppHcp1eUg4aF7hCj+LwFDC5uIg5WkVM0DLjGREvmiNPzfmwjrVaWnWlmktvjdoththXxQ\nMSP9yKiORDoCWsNkjcbk091X3xD0Jd24L1rHDzlbFvuX0CfawIPFHJxujTJdCo4Srjsu2N\nO4nuMD+O6nAYY6qNKgVnxUvPRmmDvrR0kZGo+xAAAAAwEAAQAAAQEAsCclFZ+eszGuA2tg\naKxQFtvQOtsiVVOMDHfJ1wE15B6xTY39vA40j/azrxY/HOUBOpxzcXnafvKvpU+IKqThVX\nbby/ON3/Z/Z/2fhN2BoO/yDZ9mTElrFjXRXPoV6U59ID27Q73eqoAbsChtvb+NUVLiXPET\nV69SbqPCDPrfY2V5eEceE+jir69y8vnd9AkkkYbFG0HI9lHQyoAiaWfISb3HbX0PFKAYos\n1RYYurAhx6UI7w5t+rwLMiRDN3giK7t/tSB+ylGes29YVpkze32FONCc8QqWgVZBmIxgUs\nowAr0XaqdZGaJ2rQtRd+YIXLpKCkmtwNeLsgT/uwMH/wAQAAAIEA70UZJhVvna8mqx30rk\nd5o9gH0FY/dD0lP3aH3wKXlJss1BjmrgrwL5hxG6cKC5hOlU75s7RiFXUq4gpv6Pw41jEk\ndtK/t+snGyp4emnp0w61zGfjtZcgmikv+M1o4EUx1ihjR0Rrrl0n5DqwxLE4SLPaKFi0uP\n4iznPWhjI2muUAAACBAPbZfpXIYl/MSbC6jx+h4nCflrH4bN8KQ7lEBBWBfw3LhAA3i/N8\n6GPosQ8EKKi63KJGrN2g/cTo/Pj+RI8Df33iR8nOwT0aai7yEM66dBgKNLGwneAyHXoCX0\n3xKBROeQdBBz494v4gjx4gHbsp8FTceT1Jl7rINSYKLbjw+w6xAAAAgQDGSDt7rxmidUtd\n5SAeAgfQ4MIqJNR+WjZwF+i7Ic+S1ksCGXY36w4O5pjt7u1TzXdsZc5ffQAIWRtvPUjZxJ\n30SuNX1j81EqIXk1xqXKjCupbbDVE8ajyevmr7uIBV45QY+n0+NSE7z721yHK4s/IjbD6V\n58Dj3uwCAL7MRXHRAQAAABZicmlua0BERVNLVE9QLUpPRVVST0NLAQID\n-----END OPENSSH PRIVATE KEY-----"

	// Look for config.json in relative paths
	var configPaths []string
	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		configPaths = append(configPaths,
			filepath.Join(exeDir, "config.json"),
			filepath.Join(exeDir, "..", "config.json"),
			filepath.Join(exeDir, "..", "..", "config.json"),
		)
	}
	configPaths = append(configPaths, "../../config.json", "../config.json", "./config.json", "config.json")

	for _, path := range configPaths {
		file, err := ioutil.ReadFile(path)
		if err == nil {
			_ = json.Unmarshal(file, &config)
			break
		}
	}

	// Resolve settings (CLI flags override config.json / hardcoded defaults)
	targetInput := *targetFlag
	if targetInput == "" {
		targetInput = config.TargetIP
	}

	port := *portFlag
	if port == 0 {
		port = config.Port
	}
	if port == 0 {
		port = 22
	}

	username := *userFlag
	if username == "" {
		username = config.Username
	}

	password := *passFlag
	if password == "" {
		password = config.InvalidPassword
	}

	interval := config.Interval
	if *intervalFlag != -1 {
		interval = *intervalFlag
	} else if interval == 0 {
		interval = 5
	}

	count := config.Count
	if *countFlag != -1 {
		count = *countFlag
	} else if count == 0 {
		count = 3
	}

	authMethod := config.AuthMethod
	if authMethod == "" {
		authMethod = "password"
	}
	invalidKeyData := config.InvalidKeyData

	// Interactive mode fallbacks
	if targetInput == "" {
		targetInput = readInput("Enter Target Linux IP/List/CIDR: ")
	}
	if username == "" {
		username = readInput("Enter Target Username: ")
	}
	if password == "" && authMethod == "password" {
		password = readInput("Enter Invalid Password (to fail auth): ")
	}

	targets := parseTargets(targetInput)

	fmt.Println("==============================================")
	fmt.Println("Starting SSH Logon Failure Emulation Loop (Go)")
	fmt.Printf("Targets  : %s\n", strings.Join(targets, ", "))
	fmt.Printf("Port     : %d\n", port)
	fmt.Printf("Username : %s\n", username)
	fmt.Printf("Password : [REDACTED]\n")
	fmt.Printf("Auth Mode: %s\n", authMethod)
	fmt.Printf("Interval : %d seconds\n", interval)
	if count == 0 {
		fmt.Println("Count    : Infinite (Press Ctrl+C to terminate)")
	} else {
		fmt.Printf("Count    : %d\n", count)
	}
	fmt.Println("==============================================")

	iteration := 0
	for {
		for _, target := range targets {
			iteration++
			if count != 0 && iteration > count {
				fmt.Printf("Completed requested %d attempts. Exiting.\n", count)
				return
			}

			currentTime := time.Now().Format("2006-01-02 15:04:05")
			fmt.Printf("[%s] Attempt #%d: Sending failed SSH authentication to %s:%d...\n", currentTime, iteration, target, port)

			// Setup SSH Client configurations
			var authMethods []ssh.AuthMethod
			if authMethod == "publickey" && invalidKeyData != "" {
				signer, err := ssh.ParsePrivateKey([]byte(invalidKeyData))
				if err == nil {
					authMethods = append(authMethods, ssh.PublicKeys(signer))
				} else {
					fmt.Printf("  [WARNING] Failed to parse private key: %v. Falling back to password auth.\n", err)
					authMethods = append(authMethods, ssh.Password(password))
				}
			} else {
				authMethods = append(authMethods, ssh.Password(password))
			}

			sshConfig := &ssh.ClientConfig{
				User: username,
				Auth: authMethods,
				HostKeyCallback: ssh.InsecureIgnoreHostKey(),
				Timeout:         3 * time.Second,
			}

			addr := net.JoinHostPort(target, fmt.Sprintf("%d", port))
			
			client, err := ssh.Dial("tcp", addr, sshConfig)
			if err != nil {
				errStr := strings.ToLower(err.Error())
				if strings.Contains(errStr, "authenticate") || strings.Contains(errStr, "handshake failed") || strings.Contains(errStr, "preauth") {
					fmt.Println("  [SUCCESS] Triggered SSH Logon Failure status (auth failure log generated on target).")
				} else {
					fmt.Printf("  [INFO] Attempt completed. SSH Response: %v\n", err)
				}
			} else {
				fmt.Printf("  [WARNING] Established SSH session successfully to %s! (Verify if credentials are correct)\n", target)
				_ = client.Close()
			}

			if count == 0 || iteration < count {
				time.Sleep(time.Duration(interval) * time.Second)
			}
		}

		if count != 0 {
			break
		}
	}
}

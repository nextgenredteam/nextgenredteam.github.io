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

	"github.com/hirochachacha/go-smb2"
)

// Config holds target details
type Config struct {
	TargetIP        string `json:"target_ip"`
	Domain          string `json:"domain"`
	Username        string `json:"username"`
	InvalidPassword string `json:"invalid_password"`
	Interval        int    `json:"interval"`
	Count           int    `json:"count"`
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
	targetFlag := flag.String("t", "", "Target Windows IP, list, or CIDR block")
	domainFlag := flag.String("d", "", "Target Domain or WORKGROUP (default: WORKGROUP)")
	userFlag := flag.String("u", "", "Target Username")
	passFlag := flag.String("p", "", "Invalid Password to fail authentication")
	intervalFlag := flag.Int("i", -1, "Interval in seconds between attempts")
	countFlag := flag.Int("c", -1, "Number of attempts to run (0 for infinite)")
	flag.Parse()

	var config Config

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

	domain := *domainFlag
	if domain == "" {
		domain = config.Domain
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

	// Interactive mode fallbacks
	if targetInput == "" {
		targetInput = readInput("Enter Target Windows IP/List/CIDR: ")
	}
	if domain == "" {
		domain = readInput("Enter Target Domain/WORKGROUP [WORKGROUP]: ")
		if domain == "" {
			domain = "WORKGROUP"
		}
	}
	if username == "" {
		username = readInput("Enter Target Username: ")
	}
	if password == "" {
		password = readInput("Enter Invalid Password (to fail auth): ")
	}

	targets := parseTargets(targetInput)

	fmt.Println("==============================================")
	fmt.Println("Starting Event ID 4625 Emulation Loop (Go)")
	fmt.Printf("Targets  : %s\n", strings.Join(targets, ", "))
	fmt.Printf("Domain   : %s\n", domain)
	fmt.Printf("Username : %s\n", username)
	fmt.Printf("Password : [REDACTED]\n")
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
			fmt.Printf("[%s] Attempt #%d: Sending failed SMB authentication to %s...\n", currentTime, iteration, target)

			// Setup network connection to SMB port
			conn, err := net.DialTimeout("tcp", net.JoinHostPort(target, "445"), 3*time.Second)
			if err != nil {
				fmt.Printf("  [WARNING] Port 445 on target %s is unreachable: %v\n", target, err)
			} else {
				// Initialize go-smb2 NTLMSSP initiator
				d := &smb2.Dialer{
					Initiator: &smb2.NTLMInitiator{
						User:     username,
						Password: password,
						Domain:   domain,
					},
				}

				// Perform real SMB session setup dial attempt
				s, err := d.Dial(conn)
				if err != nil {
					errStr := strings.ToUpper(err.Error())
					if strings.Contains(errStr, "STATUS_LOGON_FAILURE") || strings.Contains(errStr, "STATUS_ACCESS_DENIED") || strings.Contains(errStr, "AUTHENTICATION") {
						fmt.Println("  [SUCCESS] Triggered Logon Failure status (Event ID 4625 generated on target).")
					} else {
						fmt.Printf("  [INFO] Attempt completed. SMB Response: %v\n", err)
					}
				} else {
					fmt.Println("  [WARNING] Session established successfully! (Check if configured credentials are correct)")
					_ = s.Logoff()
				}
				_ = conn.Close()
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

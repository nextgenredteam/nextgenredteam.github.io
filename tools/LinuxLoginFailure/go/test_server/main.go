package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"log"
	"net"

	"golang.org/x/crypto/ssh"
)

func generateHostKey() (ssh.Signer, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}
	pemKey := &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	}
	pemBytes := pem.EncodeToMemory(pemKey)
	return ssh.ParsePrivateKey(pemBytes)
}

func main() {
	config := &ssh.ServerConfig{
		PasswordCallback: func(c ssh.ConnMetadata, pass []byte) (*ssh.Permissions, error) {
			log.Printf("[SSH SERVER] LOGIN ATTEMPT: User '%s' attempted login with password '%s'\n", c.User(), string(pass))
			return nil, fmt.Errorf("password rejected")
		},
	}

	signer, err := generateHostKey()
	if err != nil {
		log.Fatalf("Failed to generate host key: %v", err)
	}
	config.AddHostKey(signer)

	listener, err := net.Listen("tcp", "127.0.0.1:2222")
	if err != nil {
		log.Fatalf("Failed to listen on 127.0.0.1:2222: %v", err)
	}
	defer listener.Close()

	fmt.Println("==============================================")
	fmt.Println(" User-Space Go SSH Server listening on 127.0.0.1:2222")
	fmt.Println(" Rejects all logins and logs credentials")
	fmt.Println("==============================================")

	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Printf("Failed to accept connection: %v\n", err)
			continue
		}

		go func(c net.Conn) {
			defer c.Close()
			_, _, _, err := ssh.NewServerConn(c, config)
			if err != nil {
				// Handshake / Auth failure is expected
				log.Printf("[SSH SERVER] Connection handshake completed (or auth failed): %v\n", err)
			}
		}(conn)
	}
}

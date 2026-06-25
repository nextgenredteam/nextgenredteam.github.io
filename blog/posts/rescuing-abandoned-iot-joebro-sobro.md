---
title: "Rescuing Abandoned IoT: How I Built JoeBro to Control My Smart Table"
date: "2026-06-09"
author: "Joe B. The Blind Hacker"
description: "When manufacturers abandon their mobile apps, expensive smart hardware turns into a brick. Here is how I reverse-engineered the Ayla Networks API to build a zero-backend PWA."
---

# Rescuing Abandoned IoT: How I Built JoeBro to Control My Smart Table

There is a growing crisis in modern consumer electronics: **orphaned smart hardware.** 

You buy a premium, high-tech device—a smart refrigerator, an automated light system, or in my case, a Sobro Smart Coffee Table. A few years pass, the manufacturer shifts focus, and their official mobile app gets abandoned. Suddenly, the app crashes on modern iOS or Android versions, and you are left with a thousand-dollar piece of hardware that you can no longer control.

I refuse to let my technology be taken away from me by bad app updates. So when my Sobro table's official app completely stopped working, I decided to build my own interface: **JoeBro Web Controller.**

Here is the story of how I rescued my smart table, reverse-engineered its cloud connectivity, and how you can use my open-source tools to connect your table to the internet today.

---

## The Problem: The Bricked Smart Table

The Sobro Smart Coffee Table is a great piece of furniture. It features a built-in refrigerator drawer, Bluetooth speakers, charging ports, drawer locks, and customizable RGB LED lights. 

However, all of the table's "smart" features—the lights, the drawer locks, the fridge temp controls—rely on a mobile app to function. Unfortunately, the official Sobro app is notoriously buggy and fails to run on modern Android versions. Furthermore, the local connection protocol on the table is locked behind AES encryption keys that are unique to each device, making local network control nearly impossible without extracting the key from the official app.

Instead of trying to patch a broken Android APK, I looked at the network traffic.

---

## Reverse Engineering the Cloud: The Ayla Networks API

Under the hood, the Sobro table's smart chip is powered by **Ayla Networks**, a popular IoT cloud platform. The table connects to your Wi-Fi, logs into the Ayla Cloud, and waits for commands. The mobile app doesn't actually talk to the table directly; it sends REST commands to Ayla, which relays them to the table.

By sniffing the traffic of a legacy device connected to the app, I mapped out the entire Ayla Cloud REST API used by the table. Because it uses standard JSON payloads and simple HTTP requests, I realized we don't need a mobile app at all. We can control the table directly from a static web page!

I built **JoeBro**—a zero-backend Progressive Web App (PWA) written in vanilla HTML, CSS, and Javascript. It runs 100% in your browser, communicates directly with Ayla's servers, and unlocks hidden features (like forcing Bluetooth pairing mode or fine-tuning backlight brightness) that were never exposed in the official app.

---

## Guide: Connecting Your Sobro Table to the Web

To use the JoeBro controller, your table must be connected to your local Wi-Fi. If you changed your Wi-Fi router or bought a new table, you cannot use the official app to connect it. 

I wrote two custom scripts, `provision.ps1` (Windows PowerShell) and `provision.sh` (Mac/Linux), which emulate the initial configuration handshake. Here is how to use them:

### 1. Wi-Fi Chip Network Constraints (CRITICAL)
The Wi-Fi chip inside the Sobro table is old and highly sensitive. If your network does not meet these requirements, the chip will crash or refuse to connect:
* **2.4 GHz Band Only:** The table does not support 5 GHz networks. Ensure your router broadcasts a separate 2.4 GHz SSID.
* **WPA2-Personal Security:** You must use WPA2-Personal (AES) encryption. **Do not use WPA3 or WPA2/WPA3 Mixed mode.** If the table detects a WPA3 transition element in the beacon, the chip will crash and revert to AP setup mode.

### 2. Running the Provisioning Script
1. Press and hold the physical power button on the back/underside of your Sobro table until the lights flash. This puts the table into Access Point (AP) mode.
2. Open your computer's Wi-Fi menu and connect to the unsecured network broadcasted by the table (usually named `Sobro_XXXX`).
3. Download the JoeBro setup files from our [GitHub Tools Repository](https://github.com/nextgenredteam).
4. Open a terminal, navigate to the folder, and run:
   ```powershell
   # Windows
   .\provision.ps1
   ```
   or
   ```bash
   # Mac/Linux
   chmod +x provision.sh
   ./provision.sh
   ```
5. The script will perform a **2-Step Handshake**:
   * **Step 1:** It injects your home Wi-Fi SSID and password directly into the table's local setup server. The table will reboot and connect to your home Wi-Fi.
   * **Step 2:** The script will pause and ask you to reconnect your computer to your home Wi-Fi. It will then prompt you for your Ayla Cloud credentials, log into your account, and bind the table's unique Serial Number (DSN) to your Ayla account.
 6. Open your JoeBro controller interface, log in, and take control of your smart table!
    * *Tip: If your account uses Facebook Login, or if you don't want to enter your password into the PWA, look for the **"Help: How to get your Token or Facebook Code"** button on the JoeBro login overlay. It details all the Facebook callback URL, browser DevTools, and CLI terminal API tricks to get you authenticated easily.*

---

## Reclaiming Our Hardware

The success of the JoeBro app shows that we don't have to accept the planned obsolescence of smart devices. If a cloud service is active, we can reverse-engineer it. And if the cloud service ever shuts down completely, we can use local DNS redirection to fake the cloud server and run the table offline.

The JoeBro app code is fully open-source and hosted in our prominent repo spot. Check it out and run it yourself!

*Get the code and scripts on the [NextGenRedTeam GitHub](https://github.com/nextgenredteam) or access the controller at [/tools/joebro/](file:///f:/OneDrive/NGRT/Website/tools/joebro/index.html).*

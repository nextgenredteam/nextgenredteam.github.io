# JoeBro Web Controller
      _            ____             
     | | ___   ___| __ ) _ __ ___   
  _  | |/ _ \ / _ \  _ \| '__/ _ \  
 | |_| | (_) |  __/ |_) | | | (_) | 
  \___/ \___/ \___|____/|_|  \___/  
```
**Written by Joe B. The Blind Hacker**

A completely standalone, client-side Progressive Web App (PWA) to control the JoeBro Smart Table (formerly Sobro) directly over the Ayla Networks Cloud API.

## Project Features
- **Zero Backend**: Operates 100% in your browser. No Docker, no Python, no web servers required.
- **Real-Time Control**: Employs a custom API throttler to safely allow real-time color and brightness dragging without hitting API rate limits.
- **Mobile First**: Built with responsive CSS and touch-action protections for a flawless mobile experience.
- **Hidden Features Unlocked**: Access to undocumented capabilities like forcing Bluetooth Pairing mode and fine-tuning backlight brightness.

## Why this exists
The official Android app often crashes on modern devices, rendering the table uncontrollable. Furthermore, the table's local LAN protocol requires AES encryption keys that are impossible to extract without the official app. This PWA bypasses the mobile app entirely by authenticating directly with the Ayla Cloud API to push commands to the table.

## Network Requirements
For the Sobro Table to communicate with the Ayla Cloud, it must be connected to a Wi-Fi network. The internal Wi-Fi chip is very old and strictly requires:
- **2.4 GHz Band Only** (It cannot see or connect to 5GHz networks).
- **WPA2-Personal Security** (Mixed WPA2/WPA3 mode will cause the chip to crash and revert to AP mode).

## Initial Setup (Adding a New Table)
If you buy a new table or change your Wi-Fi password, you must use the included provisioning scripts. The official app is broken, so these scripts emulate the Ayla Device Registration Handshake.

1. Hold the table's power button until the lights flash (AP Mode).
2. Connect your computer to the unsecured `Sobro_XXXX` Wi-Fi hotspot broadcasted by the table.
3. Run `.\provision.ps1` (Windows) or `./provision.sh` (Mac/Linux).
4. The script will perform a **2-Step Handshake**:
   - **Step 1:** It generates a random `setup_token` and injects your Wi-Fi credentials into the table's hardware via its local web server. The table will immediately reboot and connect to your home router.
   - **Step 2:** The script will pause and ask you to connect your computer back to your home Wi-Fi. It will then ask for your Ayla Email and Password, log into the Ayla Cloud, and submit the `setup_token` to permanently bind the table to your account.
5. Once complete, open the JoeBro Web Controller and your new table will appear!

## How to use the PWA
Because this app relies entirely on standard HTTP REST calls with CORS support, **no backend server is required**.
1. Double-click `index.html` to open it in any modern web browser.
2. Modify `app.js` and input your Ayla `APP_ID` and `APP_SECRET`.
3. Host the directory on any basic web server, or simply open `index.html` locally in your browser.

## Ayla Cloud API Architecture
To bypass the broken Android app, the PWA communicates directly with the Ayla Cloud using the following REST endpoints:

1. **Authentication:**
   - `POST https://user-field.aylanetworks.com/users/sign_in.json`
   - Payload: Email, Password, App ID, App Secret
   - Returns: A 12-hour `access_token` required for all subsequent calls.

2. **Device Discovery:**
   - `GET https://ads-field.aylanetworks.com/apiv1/devices.json`
   - Headers: `Authorization: auth_token <token>`
   - Returns: A list of hardware devices bound to the user's account, including their unique `dsn` (Device Serial Number).

3. **State Synchronization:**
   - `GET https://ads-field.aylanetworks.com/apiv1/dsns/<dsn>/properties.json`
   - Returns: A massive JSON array containing the current live state of every hardware component on the table.

4. **Command Execution:**
   - `POST https://ads-field.aylanetworks.com/apiv1/dsns/<dsn>/properties/<property_name>/datapoints.json`
   - Payload: `{"datapoint": {"value": <data>}}`
   - Pushes a new state value to the table. Returns `201 Created` on success.

## Future-Proofing: What if Ayla Networks Shuts Down?
The JoeBro table relies entirely on the Ayla Networks Cloud infrastructure (`user-field.aylanetworks.com` and `ads-field.aylanetworks.com`) to receive commands. If Ayla Networks goes bankrupt or drops support for the table, the hardware will lose all smart functionality. 

To prepare for this, I have stubbed out a **Mock API architecture** in the `mock-api` folder. 
If the cloud ever dies, we will use a "DNS Sinkhole" (like Pi-hole) to intercept the table's requests to `aylanetworks.com` and route them to a local Docker container running the Mock API. This local server will emulate the Ayla API handshake, ensuring the JoeBro table functions perfectly offline, forever.

## API Datapoints (Reverse Engineered)
The PWA controls the table by sending values to specific `properties` on the Ayla Cloud:
- `F_key` (Boolean): Front motion light toggle.
- `B_key` (Boolean): Back LED accent lights toggle.
- `Cooling_switch` (Boolean): Mini-fridge compressor toggle.
- `Drawer_lock` (Boolean): Electronic drawer locks.
- `flight_status` (String): Controls the front light's duration and brightness. Format is `Mode:Brightness:Duration:Temperature`.
- `mode_status` (Integer): Controls the RGB color of the backlights. The hex RGB color is packed into a 32-bit integer alongside the active scene mode using bitwise shifting.

/* 
 * JoeBro Web Controller
 * Written by Joe B. The Blind Hacker
 */
document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const loginOverlay = document.getElementById('login-overlay');
    const dashboard = document.getElementById('dashboard');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const btnLogin = document.getElementById('btn-login');
    const loginStatus = document.getElementById('login-status');
    const dashboardStatus = document.getElementById('dashboard-status');
    const tableSelect = document.getElementById('table-select');
    const refreshBtn = document.getElementById('btn-refresh');
    const btnRename = document.getElementById('btn-rename');
    const durationSlider = document.getElementById('duration-slider');
    const durationVal = document.getElementById('duration-val');
    const tempSlider = document.getElementById('temp-slider');
    const tempVal = document.getElementById('temp-val');
    const brightnessSlider = document.getElementById('brightness-slider');
    const brightnessVal = document.getElementById('brightness-val');
    const rgbPicker = document.getElementById('rgb-picker');

    // Ayla Cloud Settings
    let APP_ID = 'sobro-ag-id';
    let APP_SECRET = 'sobro-mDM8M4JEe7IJFwiKvbs956XqX_s';

    // Detect if we should use the local Proxy Gateway (secures APP_SECRET and credentials)
    const useProxy = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port !== '');
    
    const USER_URL = useProxy ? '/api/proxy' : 'https://user-field.aylanetworks.com';
    const ADS_URL = useProxy ? '/api/proxy' : 'https://ads-field.aylanetworks.com';
    let authToken = localStorage.getItem('ayla_auth_token') || null;

    // Throttle helper for live-updating sliders (avoids DDoS'ing Ayla API)
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        }
    }

    // Check config.json for auto-login
    async function loadConfigAndLogin() {
        if (authToken) {
            showDashboard();
            return;
        }

        if (useProxy) {
            console.log("Using secure server-side credentials proxy.");
            return;
        }

        try {
            const res = await fetch('config.json');
            if (res.ok) {
                const config = await res.json();
                APP_ID = config.app_id || APP_ID;
                APP_SECRET = config.app_secret || APP_SECRET;
                if (config.email && config.password) {
                    loginStatus.textContent = "Auto-logging in from config...";
                    await performLogin(config.email, config.password);
                }
            }
        } catch (err) {
            console.log("No config.json found, waiting for manual login.");
        }
    }

    loadConfigAndLogin();

    async function performLogin(email, password) {
        try {
            const res = await fetch(`${USER_URL}/users/sign_in.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user: {
                        email: email,
                        password: password,
                        application: {
                            app_id: APP_ID,
                            app_secret: APP_SECRET
                        }
                    }
                })
            });

            const data = await res.json();
            if (res.ok) {
                authToken = data.access_token;
                localStorage.setItem('ayla_auth_token', authToken);
                loginStatus.textContent = "Success!";
                showDashboard();
            } else {
                loginStatus.textContent = `Error: ${data.error || 'Authentication failed'}`;
            }
        } catch (err) {
            loginStatus.textContent = "Network error connecting to Ayla Cloud.";
        }
    }

    btnLogin.addEventListener('click', async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        loginStatus.textContent = "Authenticating...";
        await performLogin(email, password);
    });

    function showDashboard() {
        loginOverlay.style.display = 'none';
        dashboard.style.display = 'block';
        discoverTables();
    }

    async function discoverTables() {
        dashboardStatus.textContent = 'Discovering tables from cloud...';
        try {
            const res = await fetch(`${ADS_URL}/apiv1/devices.json`, {
                headers: { 'Authorization': `auth_token ${authToken}` }
            });

            if (res.status === 401) {
                // Token expired
                localStorage.removeItem('ayla_auth_token');
                location.reload();
                return;
            }

            const devices = await res.json();
            const customNames = JSON.parse(localStorage.getItem('joebro_names') || '{}');
            
            tableSelect.innerHTML = '';
            if (devices.length === 0) {
                tableSelect.innerHTML = '<option value="">No tables found on your account</option>';
                dashboardStatus.textContent = 'No tables found.';
                return;
            }

            devices.forEach(d => {
                const option = document.createElement('option');
                option.value = d.device.dsn;
                option.textContent = customNames[d.device.dsn] || d.device.product_name || `JoeBro (${d.device.dsn})`;
                tableSelect.appendChild(option);
            });
            
            dashboardStatus.textContent = 'Connected to Ayla Cloud. Ready.';
            
            // Auto-sync the first discovered table on load
            if (devices.length > 0) {
                syncDeviceState();
            }
        } catch (err) {
            dashboardStatus.textContent = 'Error fetching devices.';
        }
    }

    refreshBtn.addEventListener('click', discoverTables);

    btnRename.addEventListener('click', () => {
        const dsn = tableSelect.value;
        if (!dsn) {
            alert('Please select a JoeBro first!');
            return;
        }
        
        const currentName = tableSelect.options[tableSelect.selectedIndex].text;
        const newName = prompt('Enter a new name for this JoeBro:', currentName);
        
        if (newName && newName.trim() !== '') {
            const customNames = JSON.parse(localStorage.getItem('joebro_names') || '{}');
            customNames[dsn] = newName.trim();
            localStorage.setItem('joebro_names', JSON.stringify(customNames));
            discoverTables();
        }
    });

    tableSelect.addEventListener('change', syncDeviceState);

    // Sync UI with actual hardware properties from Cloud
    async function syncDeviceState() {
        const dsn = tableSelect.value;
        if (!dsn) return;

        dashboardStatus.textContent = 'Syncing hardware state...';
        try {
            const res = await fetch(`${ADS_URL}/apiv1/dsns/${dsn}/properties.json`, {
                headers: { 'Authorization': `auth_token ${authToken}` }
            });

            if (res.ok) {
                const data = await res.json();
                
                // Parse properties array into a simple dictionary
                const props = {};
                data.forEach(p => {
                    props[p.property.name] = p.property.value;
                });

                // Update basic toggles
                if (props['Cooling_switch'] !== undefined) document.getElementById('toggle-fridge').checked = (props['Cooling_switch'] == 1);
                if (props['Drawer_lock'] !== undefined) document.getElementById('toggle-lock').checked = (props['Drawer_lock'] == 1);
                if (props['ble_switch'] !== undefined) document.getElementById('toggle-ble').checked = (props['ble_switch'] == 1);
                if (props['F_key'] !== undefined) document.getElementById('toggle-front-light').checked = (props['F_key'] == 1);
                if (props['B_key'] !== undefined) document.getElementById('toggle-back-light').checked = (props['B_key'] == 1);

                // Update Brightness
                if (props['brightness'] !== undefined) {
                    brightnessSlider.value = props['brightness'];
                    brightnessVal.textContent = props['brightness'] + "%";
                }

                // Update Flight Status (Duration & Temperature)
                // Format: Mode:Brightness:Duration:Temperature
                if (props['flight_status']) {
                    const parts = props['flight_status'].split(':');
                    if (parts.length >= 4) {
                        durationSlider.value = parts[2];
                        durationVal.textContent = parts[2];
                        
                        tempSlider.value = parts[3];
                        tempVal.textContent = parts[3] + "K";
                    }
                }

                // Update RGB Color Picker from 31-bit integer
                if (props['mode_status'] !== undefined) {
                    // Convert to 31-bit binary string padded with 0s
                    let binStr = Number(props['mode_status']).toString(2).padStart(31, '0');
                    
                    // Extract Green, Blue, Red based on Sobro packing: G(8) B(8) R(8) Zeros(7)
                    if (binStr.length >= 31) {
                        const gHex = parseInt(binStr.substring(0, 8), 2).toString(16).padStart(2, '0');
                        const bHex = parseInt(binStr.substring(8, 16), 2).toString(16).padStart(2, '0');
                        const rHex = parseInt(binStr.substring(16, 24), 2).toString(16).padStart(2, '0');
                        
                        rgbPicker.value = `#${rHex}${gHex}${bHex}`;
                    }
                }

                dashboardStatus.textContent = 'Hardware state synchronized. Ready.';
            } else {
                dashboardStatus.textContent = 'Error syncing hardware state.';
            }
        } catch (err) {
            dashboardStatus.textContent = 'Network error during sync.';
        }
    }

    // Map simple toggles
    const controls = {
        'toggle-front-light': 'F_key',
        'toggle-back-light': 'B_key',
        'toggle-fridge': 'Cooling_switch',
        'toggle-lock': 'Drawer_lock',
        'toggle-ble': 'ble_switch'
    };

    async function sendCommand(property, value) {
        const dsn = tableSelect.value;
        if (!dsn) {
            return false;
        }

        try {
            dashboardStatus.textContent = `Sending ${property}...`;
            const res = await fetch(`${ADS_URL}/apiv1/dsns/${dsn}/properties/${property}/datapoints.json`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `auth_token ${authToken}`
                },
                body: JSON.stringify({ datapoint: { value: value } })
            });
            
            if (res.status === 201 || res.status === 200) {
                dashboardStatus.textContent = `Success!`;
                return true;
            } else {
                dashboardStatus.textContent = `Error setting property.`;
                return false;
            }
        } catch (error) {
            dashboardStatus.textContent = 'Network error during command execution.';
            return false;
        }
    }

    // Toggle Listeners (No throttle needed for checkboxes)
    Object.keys(controls).forEach(id => {
        const checkbox = document.getElementById(id);
        if(checkbox) {
            checkbox.addEventListener('change', async (e) => {
                const success = await sendCommand(controls[id], e.target.checked ? 1 : 0);
                if (!success) e.target.checked = !e.target.checked;
            });
        }
    });

    // Flight Status Control (Duration + Temperature) - Throttled for live dragging
    const updateFlightStatus = throttle(async () => {
        const dur = durationSlider.value;
        const temp = tempSlider.value;
        // Format: Mode:Brightness:Duration:Temperature 
        await sendCommand('flight_status', `5:100:${dur}:${temp}`);
    }, 500); // Max 2 requests per second

    durationSlider.addEventListener('input', (e) => {
        durationVal.textContent = e.target.value;
        updateFlightStatus();
    });
    
    tempSlider.addEventListener('input', (e) => {
        tempVal.textContent = e.target.value + "K";
        updateFlightStatus();
    });

    // Backlight Brightness Listener - Throttled
    const updateBrightness = throttle(async () => {
        await sendCommand('brightness', brightnessSlider.value);
    }, 500);

    brightnessSlider.addEventListener('input', (e) => {
        brightnessVal.textContent = e.target.value + "%";
        updateBrightness();
    });

    // RGB Picker Listener - Throttled for live dragging
    const updateRgb = throttle(async (hex) => {
        // The Sobro hardware expects a highly specific 31-bit integer packing:
        // Green(8 bits) + Blue(8 bits) + Red(8 bits) + ModeZeros(7 bits)
        const rStr = parseInt(hex.substring(0, 2), 16).toString(2).padStart(8, '0');
        const gStr = parseInt(hex.substring(2, 4), 16).toString(2).padStart(8, '0');
        const bStr = parseInt(hex.substring(4, 6), 16).toString(2).padStart(8, '0');
        
        const binaryStr = gStr + bStr + rStr + "0000000";
        const modeStatusInt = parseInt(binaryStr, 2);

        await sendCommand('mode_status', modeStatusInt);
    }, 500);

    rgbPicker.addEventListener('input', (e) => {
        updateRgb(e.target.value.replace('#', ''));
    });

    // ====================================================
    // Facebook Login Flow
    // ====================================================
    const btnFacebook = document.getElementById('btn-facebook');
    const loginForm = document.getElementById('login-form');
    const facebookCodeContainer = document.getElementById('facebook-code-container');
    const fbCodeInput = document.getElementById('fb-code-input');
    const btnFacebookCancel = document.getElementById('btn-facebook-cancel');
    const btnFacebookSubmit = document.getElementById('btn-facebook-submit');

    if (btnFacebook) {
        btnFacebook.addEventListener('click', async () => {
            loginStatus.textContent = "Requesting Facebook Auth URL...";
            try {
                const res = await fetch(`${USER_URL}/users/sign_in.json`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user: {
                            auth_method: "facebook_provider",
                            application: {
                                app_id: APP_ID,
                                app_secret: APP_SECRET
                            }
                        }
                    })
                });

                const data = await res.json();
                if (res.ok && data.url) {
                    // Open Facebook OAuth page in a new tab so the address bar is fully visible
                    window.open(data.url, '_blank');
                    
                    // Switch UI view to Code Input
                    loginForm.style.display = 'none';
                    facebookCodeContainer.style.display = 'block';
                    loginStatus.textContent = "Facebook OAuth tab opened. Please log in, copy the redirect URL from the address bar, and paste it below.";
                } else {
                    loginStatus.textContent = `Error: ${data.error || 'Failed to start Facebook auth'}`;
                }
            } catch (err) {
                loginStatus.textContent = "Network error starting Facebook auth.";
            }
        });
    }

    if (btnFacebookCancel) {
        btnFacebookCancel.addEventListener('click', () => {
            facebookCodeContainer.style.display = 'none';
            loginForm.style.display = 'block';
            loginStatus.textContent = "";
            fbCodeInput.value = "";
        });
    }

    if (btnFacebookSubmit) {
        btnFacebookSubmit.addEventListener('click', async () => {
            const rawVal = fbCodeInput.value.trim();
            if (!rawVal) {
                loginStatus.textContent = "Please enter the authorization code or redirect URL.";
                return;
            }

            // Extract code parameter if a full URL was pasted
            let code = rawVal;
            if (rawVal.includes('code=')) {
                try {
                    const urlObj = new URL(rawVal.startsWith('http') ? rawVal : 'http://localhost' + rawVal);
                    code = urlObj.searchParams.get('code') || rawVal;
                } catch(e) {
                    const match = rawVal.match(/[?&]code=([^&]+)/);
                    if (match) code = match[1];
                }
            }

            loginStatus.textContent = "Exchanging code for credentials...";
            try {
                const res = await fetch(`${USER_URL}/users/provider_auth.json`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: code,
                        provider: "facebook_provider",
                        redirect_url: "https://mobile.aylanetworks.com/"
                    })
                });

                const data = await res.json();
                if (res.ok && data.access_token) {
                    authToken = data.access_token;
                    localStorage.setItem('ayla_auth_token', authToken);
                    loginStatus.textContent = "Facebook Auth Success!";
                    
                    // Reset UI
                    facebookCodeContainer.style.display = 'none';
                    loginForm.style.display = 'block';
                    
                    showDashboard();
                } else {
                    loginStatus.textContent = `Error: ${data.error || 'Facebook verification failed'}`;
                }
            } catch (err) {
                loginStatus.textContent = "Network error verifying Facebook code.";
            }
        });
    }

    // ====================================================
    // Bind Device (Add Table) Flow
    // ====================================================
    const btnAddTable = document.getElementById('btn-add-table');
    const addTableModal = document.getElementById('add-table-modal');
    const btnAddTableCancel = document.getElementById('btn-add-table-cancel');
    const btnAddTableSubmit = document.getElementById('btn-add-table-submit');
    const regTokenInput = document.getElementById('reg-token-input');
    const addTableStatus = document.getElementById('add-table-status');

    if (btnAddTable) {
        btnAddTable.addEventListener('click', () => {
            addTableModal.style.display = 'flex';
            addTableStatus.textContent = "";
            regTokenInput.value = "";
        });
    }

    if (btnAddTableCancel) {
        btnAddTableCancel.addEventListener('click', () => {
            addTableModal.style.display = 'none';
        });
    }

    if (btnAddTableSubmit) {
        btnAddTableSubmit.addEventListener('click', async () => {
            const token = regTokenInput.value.trim();
            if (!token) {
                addTableStatus.textContent = "Please enter a token.";
                return;
            }

            addTableStatus.textContent = "Binding table to account...";
            
            // Format body based on token type (setup_token is typically 8 numeric digits)
            let body = { device: { regtoken: token } };
            if (/^\d{8}$/.test(token)) {
                body = { device: { setup_token: token } };
            }

            try {
                const res = await fetch(`${ADS_URL}/apiv1/devices.json`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `auth_token ${authToken}`
                    },
                    body: JSON.stringify(body)
                });

                const data = await res.json();
                if (res.status === 201 || res.status === 200) {
                    addTableStatus.textContent = "SUCCESS! Table bound to your account.";
                    setTimeout(() => {
                        addTableModal.style.display = 'none';
                        discoverTables();
                    }, 1500);
                } else {
                    addTableStatus.textContent = `Error: ${data.error || 'Binding failed. Double check your token.'}`;
                }
            } catch (err) {
                addTableStatus.textContent = "Network error binding table.";
            }
        });
    }

    // ====================================================
    // Token Bypass Login Flow
    // ====================================================
    const btnTokenToggle = document.getElementById('btn-token-login-toggle');
    const tokenLoginContainer = document.getElementById('token-login-container');
    const tokenLoginInput = document.getElementById('token-login-input');
    const btnTokenCancel = document.getElementById('btn-token-cancel');
    const btnTokenSubmit = document.getElementById('btn-token-submit');

    if (btnTokenToggle) {
        btnTokenToggle.addEventListener('click', () => {
            loginForm.style.display = 'none';
            tokenLoginContainer.style.display = 'block';
            loginStatus.textContent = "";
            tokenLoginInput.value = "";
        });
    }

    if (btnTokenCancel) {
        btnTokenCancel.addEventListener('click', () => {
            tokenLoginContainer.style.display = 'none';
            loginForm.style.display = 'block';
            loginStatus.textContent = "";
            tokenLoginInput.value = "";
        });
    }

    if (btnTokenSubmit) {
        btnTokenSubmit.addEventListener('click', async () => {
            const token = tokenLoginInput.value.trim();
            if (!token) {
                loginStatus.textContent = "Please enter an auth token.";
                return;
            }

            loginStatus.textContent = "Validating auth token with Ayla Cloud...";
            try {
                // Test token validity by requesting devices list
                const res = await fetch(`${ADS_URL}/apiv1/devices.json`, {
                    headers: { 'Authorization': `auth_token ${token}` }
                });

                if (res.ok) {
                    authToken = token;
                    localStorage.setItem('ayla_auth_token', authToken);
                    loginStatus.textContent = "Token authentication successful!";
                    
                    // Reset UI
                    tokenLoginContainer.style.display = 'none';
                    loginForm.style.display = 'block';
                    
                    showDashboard();
                } else {
                    loginStatus.textContent = "Error: Invalid or expired auth token.";
                }
            } catch (err) {
                loginStatus.textContent = "Network error validating token.";
            }
        });
    }

    // ====================================================
    // Login Help & Extraction Guide Accordion
    // ====================================================
    const btnHelpToggle = document.getElementById('btn-login-help-toggle');
    const helpContainer = document.getElementById('login-help-container');

    if (btnHelpToggle && helpContainer) {
        btnHelpToggle.addEventListener('click', () => {
            const isHidden = helpContainer.style.display === 'none';
            helpContainer.style.display = isHidden ? 'block' : 'none';
            btnHelpToggle.classList.toggle('active', isHidden);
        });
    }

    // Accordion Items
    const setupAccordionItem = (btnId, contentId) => {
        const btn = document.getElementById(btnId);
        const content = document.getElementById(contentId);
        if (btn && content) {
            btn.addEventListener('click', () => {
                const isHidden = content.style.display === 'none';
                
                // Hide all other contents
                document.querySelectorAll('.accordion-content').forEach(el => {
                    el.style.display = 'none';
                });
                document.querySelectorAll('.accordion-header').forEach(el => {
                    el.classList.remove('active');
                });

                // Toggle current
                content.style.display = isHidden ? 'block' : 'none';
                btn.classList.toggle('active', isHidden);
            });
        }
    };

    setupAccordionItem('acc-fb-btn', 'acc-fb-content');
    setupAccordionItem('acc-devtools-btn', 'acc-devtools-content');
    setupAccordionItem('acc-cli-btn', 'acc-cli-content');
});

// Register Service Worker for PWA offline capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered:', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

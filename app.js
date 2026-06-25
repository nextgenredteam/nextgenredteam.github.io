document.addEventListener('DOMContentLoaded', () => {
  
  // --- 1. DYNAMIC GLITCH LOGO ROTATION ---
  const logoImg = document.getElementById('ngrt-logo');
  if (logoImg) {
    const totalLogos = 5;
    const isBlogSub = window.location.pathname.includes('/blog/');
    const prefix = isBlogSub ? '../' : '';
    const logoPathPrefix = `${prefix}assets/logos/logo`;
    
    // Retrieve last logo index from localStorage, or default to 1
    let currentIndex = parseInt(localStorage.getItem('ngrt_logo_index') || '1', 10);
    
    // Update to next index (round-robin on page load)
    let nextIndex = (currentIndex % totalLogos) + 1;
    localStorage.setItem('ngrt_logo_index', nextIndex.toString());
    
    // Set initial logo
    logoImg.src = `${logoPathPrefix}${currentIndex}.png`;
    
    // Function to trigger a glitched swap
    const triggerLogoSwap = () => {
      logoImg.classList.add('glitching');
      
      setTimeout(() => {
        // Pick a random logo that is different from current
        let newIndex = currentIndex;
        while (newIndex === currentIndex) {
          newIndex = Math.floor(Math.random() * totalLogos) + 1;
        }
        currentIndex = newIndex;
        logoImg.src = `${logoPathPrefix}${currentIndex}.png`;
        
        setTimeout(() => {
          logoImg.classList.remove('glitching');
        }, 150);
      }, 400); // duration of glitch
    };
    
    // Swap logo on interval (every 15 seconds)
    setInterval(triggerLogoSwap, 15000);
    
    // Swap logo on hover/click for interactivity
    logoImg.addEventListener('mouseenter', triggerLogoSwap);
  }

  // --- 2. TERMINAL SCAN SIMULATOR ---
  const terminalBody = document.getElementById('terminal-body');
  if (terminalBody) {
    const scanLines = [
      { text: 'ngrt --engage --target nextgenredteam.com', type: 'command' },
      { text: '[*] Initializing NextGenRedTeam Emulation Framework v3.0...', type: 'info' },
      { text: '[+] Loading modules: [ThreatEmulation] [PurpleTeaming] [Research]', type: 'success' },
      { text: '[+] Threat Simulation Node: ACTIVE', type: 'success' },
      { text: '[*] Checking external perimeter for security controls...', type: 'info' },
      { text: '[+] Discovery: 80/tcp, 443/tcp, 22/tcp [Filtered]', type: 'success' },
      { text: '[+] Analyzing threat intelligence vectors...', type: 'info' },
      { text: '[!] DISCOVERED: Radxa AI Core AX-M1 NPU (LAMBERT AX8850)', type: 'warning' },
      { text: '[*] Compiling native axllm zero-copy server from source...', type: 'info' },
      { text: '[*] Flushing NPU PCIe driver and clearing Continuous Memory (CMM)...', type: 'info' },
      { text: '[+] Booting Qwen 1.7B NPU model via native axllm service (Port 8000)...', type: 'success' },
      { text: '[+] NPU Inference stream: ONLINE [Latency: 0.28s]', type: 'success' },
      { text: '[*] Initializing telemetry validation checks...', type: 'info' },
      { text: 'trigger_4625_windows_amd64.exe -t 192.168.1.100 -u Administrator -c 2', type: 'command' },
      { text: 'Starting Event ID 4625 Emulation Loop (Go)', type: 'info' },
      { text: 'Targets  : 192.168.1.100 | Domain: WORKGROUP | Username: Administrator', type: 'info' },
      { text: '[Attempt #1] Sending failed SMB authentication to 192.168.1.100...', type: 'info' },
      { text: '  [SUCCESS] Triggered Logon Failure status (Event ID 4625 generated on target).', type: 'success' },
      { text: '[Attempt #2] Sending failed SMB authentication to 192.168.1.100...', type: 'info' },
      { text: '  [SUCCESS] Triggered Logon Failure status (Event ID 4625 generated on target).', type: 'success' },
      { text: './trigger_ssh_failure_linux_amd64 -t 192.168.1.50 -u root -c 2', type: 'command' },
      { text: 'Starting SSH Logon Failure Emulation Loop (Go)', type: 'info' },
      { text: 'Targets  : 192.168.1.50 | Port: 22 | Username: root | Auth Mode: password', type: 'info' },
      { text: '[Attempt #1] Sending failed SSH authentication to 192.168.1.50:22...', type: 'info' },
      { text: '  [SUCCESS] Triggered SSH Logon Failure status (auth failure log generated on target).', type: 'success' },
      { text: '[Attempt #2] Sending failed SSH authentication to 192.168.1.50:22...', type: 'info' },
      { text: '  [SUCCESS] Triggered SSH Logon Failure status (auth failure log generated on target).', type: 'success' },
      { text: '[*] Spawning Swarm-AI agent worker nodes...', type: 'info' },
      { text: '[+] Allocating micro-containers: [Worker-A01] [Worker-A05]', type: 'success' },
      { text: '[+] Connected to Central SQL Intelligence Database', type: 'success' },
      { text: '[*] Smart Table reverse-engineering bypass: ACTIVE (JoeBro PWA)', type: 'info' },
      { text: 'ngrt --status // ENGAGED & SECURE', type: 'command' }
    ];

    let lineIndex = 0;
    let terminalTimeoutId = null;
    let isTabVisible = true;

    const renderNextLine = () => {
      if (!isTabVisible) return; // Pause updates if tab is backgrounded

      if (lineIndex >= scanLines.length) {
        // Clear and loop after a delay
        terminalTimeoutId = setTimeout(() => {
          terminalBody.innerHTML = '<div class="terminal-line"><span class="text-cyan">guest@ngrt-threat-lab:~$</span><span class="cursor-blink"></span></div>';
          lineIndex = 0;
          if (isTabVisible) terminalTimeoutId = setTimeout(renderNextLine, 1000);
        }, 5000);
        return;
      }

      // Remove blinking cursor from previous lines
      const activeCursors = terminalBody.querySelectorAll('.cursor-blink');
      activeCursors.forEach(c => c.remove());

      const current = scanLines[lineIndex];
      const lineDiv = document.createElement('div');
      lineDiv.className = 'terminal-line';

      if (current.type === 'command') {
        lineDiv.innerHTML = `<span class="text-cyan">guest@ngrt-threat-lab:~$</span> <span class="text-primary">${current.text}</span><span class="cursor-blink"></span>`;
        terminalBody.appendChild(lineDiv);
        lineIndex++;
        terminalTimeoutId = setTimeout(renderNextLine, 1200); // commands take longer
      } else {
        let textSpan = '';
        if (current.type === 'success') textSpan = `<span class="text-cyan">${current.text}</span>`;
        else if (current.type === 'warning') textSpan = `<span class="text-pink">${current.text}</span>`;
        else textSpan = `<span class="text-secondary">${current.text}</span>`;

        lineDiv.innerHTML = textSpan + '<span class="cursor-blink"></span>';
        terminalBody.appendChild(lineDiv);
        lineIndex++;
        terminalTimeoutId = setTimeout(renderNextLine, 600); // outputs render fast
      }

      terminalBody.scrollTop = terminalBody.scrollHeight;
    };

    // Page Visibility State Handler
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isTabVisible = false;
        clearTimeout(terminalTimeoutId);
      } else {
        if (!isTabVisible) {
          isTabVisible = true;
          renderNextLine();
        }
      }
    });

    // Kick off terminal animation
    setTimeout(renderNextLine, 1000);
  }

  // --- 3. ANTI-SCRAPING CONTACT MODAL ---
  const contactModal = document.getElementById('contact-modal');
  const contactTrigger = document.getElementById('contact-trigger');
  const closeModalBtn = document.getElementById('modal-close');
  
  // Obfuscated Contact Data via +5 char-code shift
  const encodedPhone = '<5828:<288=='; // Decrypts to: 703-357-3388
  const encodedEmail = 'Otj3Gwnspqj~Esj}yljswjiyjfr3htr'; // Decrypts to: Joe.Brinkley@nextgenredteam.com

  const decrypt = (str, shift = 5) => {
    return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) - shift)).join('');
  };

  if (contactTrigger && contactModal && closeModalBtn) {
    
    // Decrypt and display details
    const openModal = (e) => {
      e.preventDefault();
      
      const phoneDecrypted = decrypt(encodedPhone);
      const emailDecrypted = decrypt(encodedEmail);
      
      // Populate elements dynamically
      const emailVal = document.getElementById('modal-email-val');
      const phoneVal = document.getElementById('modal-phone-val');
      const emailLink = document.getElementById('modal-email-link');
      const signalLink = document.getElementById('modal-signal-link');
      const whatsappLink = document.getElementById('modal-whatsapp-link');

      if (emailVal) emailVal.innerText = emailDecrypted;
      if (phoneVal) phoneVal.innerText = phoneDecrypted;
      
      // Set hyperlinks
      if (emailLink) emailLink.href = `mailto:${emailDecrypted}`;
      
      // WhatsApp link format: https://wa.me/17033573388
      const numericPhone = phoneDecrypted.replace(/[^0-9]/g, '');
      if (whatsappLink) whatsappLink.href = `https://wa.me/1${numericPhone}`;
      
      // Signal direct chat link (or fallback to tel prompt if no username)
      if (signalLink) signalLink.href = `https://signal.me/#p/+1${numericPhone}`;

      contactModal.classList.add('active');
    };

    const closeModal = () => {
      contactModal.classList.remove('active');
    };

    contactTrigger.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    
    // Close modal if user clicks outside content
    contactModal.addEventListener('click', (e) => {
      if (e.target === contactModal) {
        closeModal();
      }
    });
  }

  // --- 4. MOBILE NAVIGATION MENU TOGGLE ---
  const burger = document.getElementById('nav-burger');
  const navLinks = document.querySelector('.nav-links');
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      burger.classList.toggle('open');
    });
  }

});

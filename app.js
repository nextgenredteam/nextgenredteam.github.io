document.addEventListener('DOMContentLoaded', () => {
  
  // --- 1. DYNAMIC GLITCH LOGO ROTATION ---
  const logoImg = document.getElementById('ngrt-logo');
  if (logoImg) {
    const totalLogos = 5;
    let logoPathPrefix = 'assets/logos/logo';
    
    // Adjust path if we are inside the /blog/ subfolder
    if (window.location.pathname.includes('/blog/')) {
      logoPathPrefix = '../assets/logos/logo';
    }
    
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
      { text: '[*] Initializing NextGenRedTeam OffSec Framework v3.0...', type: 'info' },
      { text: '[+] Loading modules: [Pentesting] [RedTeaming] [PurpleTeaming]', type: 'success' },
      { text: '[+] Threat Simulation Node: ACTIVE', type: 'success' },
      { text: '[*] Scanning external perimeter for vulnerabilities...', type: 'info' },
      { text: '[+] Discovery: 80/tcp, 443/tcp, 22/tcp [Filtered]', type: 'success' },
      { text: '[+] Analyzing threat intelligence vectors...', type: 'info' },
      { text: '[!] IDENTIFIED: Smart Table hardware detected (SoBro Table)', type: 'warning' },
      { text: '[!] WARNING: Official Android controller app reported CRASHING/ABANDONED', type: 'warning' },
      { text: '[*] Attempting API rescue sequence using JoeBro PWA...', type: 'info' },
      { text: '[+] Connected to Ayla Networks API via custom throttler', type: 'success' },
      { text: '[+] Bypassing mobile app constraints. Controls unlocked.', type: 'success' },
      { text: '[+] Table Backlight: RGB Active | Drawer Locks: Secure', type: 'success' },
      { text: '[*] Human-in-the-Loop validation: COMPLETE. System stable.', type: 'info' },
      { text: 'ngrt --status // ENGAGED & SECURE', type: 'command' }
    ];

    let lineIndex = 0;

    const renderNextLine = () => {
      if (lineIndex >= scanLines.length) {
        // Clear and loop after a delay
        setTimeout(() => {
          terminalBody.innerHTML = '<div class="terminal-line"><span class="text-cyan">guest@ngrt-threat-lab:~$</span><span class="cursor-blink"></span></div>';
          lineIndex = 0;
          setTimeout(renderNextLine, 1000);
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
        setTimeout(renderNextLine, 1200); // commands take longer
      } else {
        let textSpan = '';
        if (current.type === 'success') textSpan = `<span class="text-cyan">${current.text}</span>`;
        else if (current.type === 'warning') textSpan = `<span class="text-pink">${current.text}</span>`;
        else textSpan = `<span class="text-secondary">${current.text}</span>`;

        lineDiv.innerHTML = textSpan + '<span class="cursor-blink"></span>';
        terminalBody.appendChild(lineDiv);
        lineIndex++;
        setTimeout(renderNextLine, 600); // outputs render fast
      }

      terminalBody.scrollTop = terminalBody.scrollHeight;
    };

    // Kick off terminal animation
    setTimeout(renderNextLine, 1000);
  }

  // --- 3. ANTI-SCRAPING CONTACT MODAL ---
  const contactModal = document.getElementById('contact-modal');
  const contactTrigger = document.getElementById('contact-trigger');
  const closeModalBtn = document.getElementById('modal-close');
  
  // Base64 Obfuscated Contact Data
  // Phone: 703-357-3388 -> NzAzLTM1Ny0zMzg4
  // Email: Joe.Brinkley@nextgenredteam.com -> Sm9lLkJyaW5rbGV5QG5leHRnZW5yZWR0ZWFtLmNvbQ==
  const encodedPhone = 'NzAzLTM1Ny0zMzg4';
  const encodedEmail = 'Sm9lLkJyaW5rbGV5QG5leHRnZW5yZWR0ZWFtLmNvbQ==';

  if (contactTrigger && contactModal && closeModalBtn) {
    
    // Decrypt and display details
    const openModal = (e) => {
      e.preventDefault();
      
      const phoneDecrypted = atob(encodedPhone);
      const emailDecrypted = atob(encodedEmail);
      
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

});

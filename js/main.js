/* ============================================================
   TOPLINE STAINLESS WORX — main.js
   Nav · Hero canvas · Scroll reveals · Contact form
   ============================================================ */

/* ---------- 1. NAVIGATION ---------- */
function initNav() {
  const header = document.querySelector('.site-header');
  const hamburger = document.querySelector('.nav__hamburger');
  const links = document.querySelector('.nav__links');

  // Scroll border
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile drawer
  if (hamburger && links) {
    hamburger.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      hamburger.classList.toggle('is-open', open);
      hamburger.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        links.classList.remove('is-open');
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      })
    );
  }
}

/* ---------- 2. HERO CANVAS (3 layered effects) ----------
   Performance notes:
   - The faint blueprint grid never changes, so it's baked ONCE into an
     offscreen canvas and blitted each frame (was redrawn 60×/sec).
   - Each ember used ctx.shadowBlur — the single most expensive 2D-canvas op —
     70× per frame. Replaced with pre-rendered glow sprites drawn via drawImage.
   - Particle count scales down on small / low-core devices.
   - The loop pauses when the hero is scrolled off-screen or the tab is hidden,
     freeing the CPU for the rest of the page.
   Net result: visually identical, a fraction of the per-frame cost.            */
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ember tints — hot white-gold cores through to deep orange.
  const EMBER_COLORS = [
    [255, 224, 160],  // bright gold
    [255, 190, 110],  // amber
    [255, 150,  60],  // orange
    [255, 107,  26],  // deep orange (brand spark)
  ];

  // Scale ambition to the device: fewer embers on phones / low-core machines.
  const cores = navigator.hardwareConcurrency || 4;
  const smallScreen = window.matchMedia('(max-width: 760px)').matches;
  const PARTICLE_COUNT = smallScreen ? 28 : (cores <= 4 ? 45 : 70);

  // --- One soft glow sprite per ember colour, rendered once. ---
  // Drawing a cached image is ~free compared to recomputing a shadow blur.
  const SPRITE_SIZE = 64;
  const emberSprites = EMBER_COLORS.map(([r, g, b]) => {
    const s = document.createElement('canvas');
    s.width = s.height = SPRITE_SIZE;
    const sctx = s.getContext('2d');
    const c = SPRITE_SIZE / 2;
    const grad = sctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0,    `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.22, `rgba(${r},${g},${b},0.85)`);
    grad.addColorStop(0.55, `rgba(${r},${g},${b},0.22)`);
    grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return s;
  });

  // --- EFFECT 2: blueprint grid, baked once into an offscreen canvas. ---
  const gridCanvas = document.createElement('canvas');
  const gridCtx = gridCanvas.getContext('2d');
  function buildGrid() {
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
    gridCtx.clearRect(0, 0, canvas.width, canvas.height);
    gridCtx.strokeStyle = 'rgba(192, 192, 192, 0.035)';
    gridCtx.lineWidth = 0.5;
    const spacing = 60;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for (let y = 0; y < canvas.height; y += spacing) {
      const factor = 1 - Math.abs(y - cy) / canvas.height * 0.3;
      gridCtx.beginPath();
      gridCtx.moveTo(cx - (canvas.width / 2) * factor, y);
      gridCtx.lineTo(cx + (canvas.width / 2) * factor, y);
      gridCtx.stroke();
    }
    for (let x = 0; x < canvas.width; x += spacing) {
      const factor = 1 - Math.abs(x - cx) / canvas.width * 0.3;
      gridCtx.beginPath();
      gridCtx.moveTo(x, cy - (canvas.height / 2) * factor);
      gridCtx.lineTo(x, cy + (canvas.height / 2) * factor);
      gridCtx.stroke();
    }
  }

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    buildGrid();
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // Reduced-motion: paint a single still frame (grid only) and stop.
  if (prefersReducedMotion) { ctx.drawImage(gridCanvas, 0, 0); return; }

  // --- EFFECT 1: spark particles (rising embers) ---
  function createParticle(randomY) {
    const roll = Math.random();
    const hero = roll < 0.12;            // ~1 in 8 = a big eye-catching ember
    const big  = !hero && roll < 0.38;   // plus a tier of medium embers
    return {
      x:       Math.random() * canvas.width,
      y:       randomY ? Math.random() * canvas.height : canvas.height + 2,
      radius:  hero ? Math.random() * 2.0 + 3.5   // 3.5–5.5 px (large)
             : big  ? Math.random() * 1.6 + 1.8   // 1.8–3.4 px (medium)
                    : Math.random() * 1.3 + 0.6,  // 0.6–1.9 px (fine)
      vy:      -(Math.random() * 0.6 + (hero ? 0.22 : 0.35)), // big ones drift slower
      vx:      (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.3 + (hero ? 0.7 : 0.55),     // big ones brightest
      // big embers lean warm orange so they pop; fine ones use the full range
      colorIndex: hero ? 2 + Math.floor(Math.random() * 2)
                       : Math.floor(Math.random() * EMBER_COLORS.length),
      twinkle: Math.random() * Math.PI * 2,      // phase for subtle flicker
      glow:    hero || big,
    };
  }
  const particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(true));

  function updateParticles() {
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.twinkle += 0.15;
      if (p.y < canvas.height * 0.45) p.opacity -= 0.006;
      if (p.opacity <= 0 || p.y < 0) particles[i] = createParticle(false);
    });
  }
  function drawParticles() {
    // Additive blending makes overlapping sprites read like real embers.
    ctx.globalCompositeOperation = 'lighter';
    particles.forEach(p => {
      const flicker = 0.82 + Math.sin(p.twinkle) * 0.18;
      const alpha = Math.min(1, p.opacity * flicker);
      // Sprite is drawn larger than the core radius to recreate the glow halo.
      const halo = p.radius * (p.glow ? 5.5 : 4);
      ctx.globalAlpha = alpha;
      ctx.drawImage(emberSprites[p.colorIndex], p.x - halo, p.y - halo, halo * 2, halo * 2);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // --- EFFECT 3: breathing glow at the base of the hero ---
  let glowTick = 0;
  function drawGlow() {
    glowTick += 0.025;
    const scale = 0.9 + Math.sin(glowTick) * 0.1;
    const radius = canvas.width * 0.4 * scale;
    const cx = canvas.width / 2;
    const cy = canvas.height;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(255, 107, 26, 0.07)');
    grad.addColorStop(1, 'rgba(255, 107, 26, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // --- Run loop, paused when off-screen or tab hidden ---
  let rafId = null;
  let running = false;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(gridCanvas, 0, 0);   // blit baked grid
    drawGlow();
    updateParticles();
    drawParticles();
    rafId = requestAnimationFrame(animate);
  }
  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(animate);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Only animate while the hero is actually visible on screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach(e => e.isIntersecting ? start() : stop());
    }, { threshold: 0 }).observe(canvas);
  } else {
    start();
  }
  // And never burn CPU on a backgrounded tab.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (canvas.getBoundingClientRect().bottom > 0) start();
  });
}

/* ---------- 3. SCROLL ENTRANCE ANIMATIONS ---------- */
function initScrollAnimations() {
  const els = document.querySelectorAll('.animate-on-scroll');
  if (!els.length) return;

  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const siblings = Array.from(entry.target.parentElement.children);
        const delay = siblings.indexOf(entry.target) * 80;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(el => observer.observe(el));
}

/* ---------- 4. CONTACT FORM ---------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = document.getElementById('form-status');
  const endpoint = form.getAttribute('action');

  function setStatus(type, message) {
    if (!status) return;
    status.textContent = message;
    status.className = `form__status is-visible form__status--${type}`;
  }

  // --- Per-field inline errors -------------------------------------------
  function showFieldError(field, message) {
    const err = document.getElementById(`${field.id}-error`);
    if (err) { err.textContent = message; err.classList.add('is-visible'); }
    field.classList.add('form__control--invalid');
    field.setAttribute('aria-invalid', 'true');
  }
  function clearFieldError(field) {
    const err = document.getElementById(`${field.id}-error`);
    if (err) { err.textContent = ''; err.classList.remove('is-visible'); }
    field.classList.remove('form__control--invalid');
    field.removeAttribute('aria-invalid');
  }

  // --- Validators (industry-standard checks) -----------------------------
  // Email: practical RFC-style "x@y.z" — rejects "asdf", "a@b", "a@b."
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateField(field) {
    const value = field.value.trim();

    // Name
    if (field.id === 'name') {
      if (!value) return 'Please enter your name.';
      if (value.length < 2) return 'Please enter your full name.';
      if (!/[A-Za-z]/.test(value)) return 'Please enter a valid name.';
      return '';
    }
    // Email
    if (field.id === 'email') {
      if (!value) return 'Please enter your email address.';
      if (value.length > 254 || !EMAIL_RE.test(value)) return 'Please enter a valid email address.';
      return '';
    }
    // Phone — count digits after stripping spaces, dashes, brackets, leading +
    if (field.id === 'phone') {
      if (!value) return 'Please enter your phone number.';
      const digits = value.replace(/[\s\-().]/g, '').replace(/^\+/, '');
      if (!/^\d+$/.test(digits)) return 'Please enter a valid phone number.';
      if (digits.length < 7 || digits.length > 15) return 'Please enter a valid phone number.';
      return '';
    }
    // Service dropdown — must be a real option, not the placeholder
    if (field.id === 'service') {
      if (!value) return 'Please select a service.';
      return '';
    }
    return '';
  }

  // Validate the whole form; focus + report the first offender.
  function validateForm() {
    const fields = ['name', 'phone', 'email', 'service']
      .map(id => form.querySelector(`#${id}`))
      .filter(Boolean);
    let firstInvalid = null;
    for (const field of fields) {
      const msg = validateField(field);
      if (msg) {
        showFieldError(field, msg);
        if (!firstInvalid) firstInvalid = field;
      } else {
        clearFieldError(field);
      }
    }
    return firstInvalid;
  }

  // Clear a field's error as soon as the user starts fixing it.
  form.querySelectorAll('.form__control').forEach(field => {
    field.addEventListener('input', () => {
      if (field.classList.contains('form__control--invalid')) clearFieldError(field);
    });
    field.addEventListener('blur', () => {
      if (field.value.trim()) {
        const msg = validateField(field);
        if (msg) showFieldError(field, msg);
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot: if the hidden field is filled, it's a bot. Pretend success.
    const honeypot = form.querySelector('[name="_gotcha"]');
    if (honeypot && honeypot.value) {
      setStatus('success', 'Thank you — your message has been sent.');
      form.reset();
      return;
    }

    // Full field-level validation
    const firstInvalid = validateForm();
    if (firstInvalid) {
      setStatus('error', 'Please fix the highlighted fields and try again.');
      firstInvalid.focus();
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

    // If endpoint not yet configured (placeholder), short-circuit gracefully.
    if (!endpoint || endpoint.includes('[FORMSPREE_ENDPOINT]') || endpoint.includes('FORM_ID')) {
      setStatus('success', 'Thanks — your details are noted. (Form endpoint pending setup before launch.)');
      form.reset();
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setStatus('success', 'Thank you — your message has been sent. We will be in touch shortly.');
        form.reset();
      } else {
        setStatus('error', 'Something went wrong. Please call us on +27 68 808 9229.');
      }
    } catch (err) {
      setStatus('error', 'Network error. Please call us on +27 68 808 9229.');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
    }
  });
}

/* ---------- 5. FOOTER YEAR ---------- */
function initFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeroCanvas();
  initScrollAnimations();
  initContactForm();
  initFooterYear();
});

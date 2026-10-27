(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fluid island nav menu
  const btn = document.getElementById('menu-btn');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    menu.querySelectorAll('a').forEach((a) => (a.tabIndex = open ? 0 : -1));
  };
  menu.querySelectorAll('a').forEach((a) => {
    a.tabIndex = -1;
    a.addEventListener('click', () => setMenu(false));
  });
  btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); btn.focus(); }
  });
  window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => e.matches && setMenu(false));

  // Scroll reveals
  const reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    reveals.forEach((el) => io.observe(el));
  }

  // Cinematic hero: fade video in once playable, pointer depth, scroll push-in, pause off screen
  const hero = document.getElementById('top');
  const media = hero && hero.querySelector('.hero-media');
  const video = hero && hero.querySelector('.hero-video');
  if (video) {
    const ready = () => video.classList.add('is-ready');
    if (video.readyState >= 3) ready(); else video.addEventListener('canplay', ready, { once: true });
    if (reduceMotion) {
      video.removeAttribute('autoplay');
      video.pause();
    } else {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
      }).observe(hero);
      if (window.matchMedia('(pointer: fine)').matches) {
        hero.addEventListener('pointermove', (e) => {
          const r = hero.getBoundingClientRect();
          media.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
          media.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
        });
        hero.addEventListener('pointerleave', () => { media.style.setProperty('--px', 0); media.style.setProperty('--py', 0); });
      }
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const p = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
          media.style.setProperty('--sp', p.toFixed(3));
          ticking = false;
        });
      }, { passive: true });
    }
  }

  // Tagline: words light up one at a time as they cross a trigger line
  const tagline = document.getElementById('tagline');
  if (tagline) {
    const lines = tagline.innerHTML.split(/<br\s*\/?>/i).map((l) => l.trim().split(/\s+/));
    tagline.setAttribute('aria-label', lines.flat().join(' '));
    tagline.innerHTML = lines
      .map((ws) => ws.map((w) => `<span class="word" aria-hidden="true">${w}</span>`).join(' '))
      .join('<br>');
    const spans = [...tagline.querySelectorAll('.word')];
    if (reduceMotion) {
      spans.forEach((s) => s.classList.add('is-lit'));
    } else {
      const index = new Map(spans.map((s, i) => [s, i]));
      const wio = new IntersectionObserver((entries) => {
        const lit = entries.filter((e) => e.isIntersecting).sort((a, b) => index.get(a.target) - index.get(b.target));
        lit.forEach((e, i) => setTimeout(() => e.target.classList.add('is-lit'), i * 70));
        entries.filter((e) => !e.isIntersecting && e.boundingClientRect.top > 0).forEach((e) => e.target.classList.remove('is-lit'));
      }, { rootMargin: '0px 0px -40% 0px', threshold: 1 });
      spans.forEach((s) => wio.observe(s));
    }
  }

  // Scrollspy: mark the current section in the nav
  const links = document.querySelectorAll('[data-spy]');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => l.toggleAttribute('aria-current', false));
      const active = document.querySelector(`[data-spy="${e.target.id}"]`);
      if (active) active.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['top', 'features', 'how', 'sources', 'faq'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  });

  // FAQ accordion
  document.querySelectorAll('[data-faq]').forEach((item) => {
    const b = item.querySelector('button');
    b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      item.classList.toggle('is-open', open);
    });
  });

  // Launch list forms. Set data-endpoint on a form to POST to a real backend.
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  document.querySelectorAll('[data-join]').forEach((form) => {
    const input = form.querySelector('input[type="email"]');
    const row = form.querySelector('[data-row]');
    const error = form.querySelector('.join-error');
    const success = form.querySelector('.join-success');
    const note = form.querySelector('.join-note');
    const submit = form.querySelector('button[type="submit"]');

    const showError = (msg) => {
      error.textContent = msg;
      error.hidden = !msg;
      row.classList.toggle('has-error', !!msg);
      input.setAttribute('aria-invalid', String(!!msg));
    };
    input.addEventListener('input', () => error.hidden || showError(''));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email) return showError('Enter your email so we can tell you when Qindeel launches.'), input.focus();
      if (!EMAIL.test(email)) return showError('That email looks incomplete. Try a format like name@example.com.'), input.focus();
      showError('');
      submit.disabled = true;
      submit.classList.add('is-loading');
      try {
        const endpoint = form.dataset.endpoint;
        if (endpoint) {
          const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
          if (!res.ok) throw new Error(String(res.status));
        } else {
          await new Promise((r) => setTimeout(r, 900));
        }
        row.hidden = true;
        note.hidden = true;
        success.hidden = false;
      } catch {
        showError('We could not add you right now. Check your connection and try again.');
      } finally {
        submit.disabled = false;
        submit.classList.remove('is-loading');
      }
    });
  });

  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();

(() => {
  window.__siteReady = true;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = Boolean(window.gsap && window.ScrollTrigger);

  /* ---------- Content that works without animation ---------- */

  // "Billionaire before 2045" day counter. Day 1 was 4 May 2026 (day 162 = 12 Oct 2026).
  // If you ever miss a day, change DAY_ONE to keep the count honest.
  const DAY_ONE = new Date(2026, 4, 4);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = Math.max(1, Math.round((today - DAY_ONE) / 86400000) + 1);
  $$('.day-inline').forEach((el) => { el.textContent = day; });
  const dayStat = $('#dayStat');
  dayStat.dataset.count = day;
  dayStat.textContent = day;
  $('#year').textContent = today.getFullYear();

  // Kathmandu local time
  const timeEl = $('#ktmTime');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kathmandu' });
  const tickTime = () => { timeEl.textContent = `${fmt.format(new Date())} NPT`; };
  tickTime();
  setInterval(tickTime, 15000);

  // Split text into characters / words for animation
  const splitInto = (el) => {
    [...el.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        [...node.textContent.replace(/\s+/g, ' ').trim()].forEach((ch) => {
          const span = document.createElement('span');
          span.className = 'char';
          span.textContent = ch === ' ' ? '\u00A0' : ch;
          frag.appendChild(span);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('hl__bg')) {
        splitInto(node);
      }
    });
  };
  $$('[data-split]').forEach(splitInto);
  $('.contact__big').setAttribute('aria-label', "Let's build something big. Message me on Instagram");

  $$('[data-split-lines]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words
      .map((w) => `<span class="line" style="display:inline-block;vertical-align:top" aria-hidden="true"><span class="char">${w}</span></span>`)
      .join(' ');
  });

  $$('[data-words]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');
  });

  // Mobile menu
  const menu = $('#menu');
  const menuBtn = $('#menuBtn');
  const menuLabel = $('.nav__menu-label');
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    menuLabel.textContent = open ? 'Close' : 'Menu';
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
  };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Pitch video with custom play button
  const videoWrap = $('#video');
  const video = $('#pitchVideo');
  const playVideo = () => {
    if (videoWrap.classList.contains('is-playing')) return;
    videoWrap.classList.add('is-playing');
    videoWrap.removeAttribute('data-cursor');
    video.controls = true;
    video.play();
  };
  videoWrap.addEventListener('click', playVideo);

  const loader = $('#loader');

  // Anchor links: smooth scroll (Lenis when available)
  $$('[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = $(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      if (window.__lenis) window.__lenis.scrollTo(target, { duration: 1.6 });
      else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  if (!hasGsap || reduceMotion) {
    loader.remove();
    $('#fx').remove();
    return;
  }

  /* ---------- Motion ---------- */

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.clearScrollMemory('manual');
  window.scrollTo(0, 0);

  // Smooth scrolling
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Nav hides on scroll down, returns on scroll up
  const nav = $('#nav');
  let lastY = 0;
  const onScroll = (y) => {
    const down = y > lastY && y > 240;
    nav.classList.toggle('is-hidden', down && !menu.classList.contains('is-open'));
    lastY = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

  // Intro: loader count, then the name rises in
  const heroChars = $$('.hero__name .char');
  const heroFades = $$('.hero__top > *, .hero .fade-up');
  gsap.set(heroChars, { yPercent: 115 });
  gsap.set(heroFades, { opacity: 0, y: 24 });
  // "zen" highlight: a black bar wipes across, letters flip to paper
  const hl = $('#heroHl');
  const hlBg = $('.hl__bg', hl);
  const hlChars = $$('.char', hl);
  gsap.set(hlBg, { scaleX: 0, transformOrigin: '0% 50%' });
  gsap.set(hlChars, { color: '#121212' });

  const intro = gsap.timeline({ paused: true })
    .to(heroChars, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.04 })
    .to(heroFades, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08 }, '-=1.2')
    .to(hlBg, { scaleX: 1, duration: 0.9, ease: 'expo.inOut' }, 0.95)
    .to(hlChars, { color: '#f2f0eb', duration: 0.25, ease: 'none', stagger: 0.09 }, 1.15);

  // Hover: the bar sweeps out to the right and back in from the left
  let hlBusy = false;
  hl.addEventListener('mouseenter', () => {
    if (hlBusy || intro.isActive()) return;
    hlBusy = true;
    gsap.timeline({ onComplete: () => { hlBusy = false; } })
      .to(hlBg, { scaleX: 0, transformOrigin: '100% 50%', duration: 0.5, ease: 'expo.in' })
      .to(hlChars, { color: '#121212', duration: 0.2, stagger: 0.05 }, 0.15)
      .set(hlBg, { transformOrigin: '0% 50%' })
      .to(hlBg, { scaleX: 1, duration: 0.7, ease: 'expo.out' })
      .to(hlChars, { color: '#f2f0eb', duration: 0.2, stagger: 0.06 }, '<0.05');
  });

  let firstVisit = true;
  try {
    firstVisit = !sessionStorage.getItem('cr-intro');
    sessionStorage.setItem('cr-intro', '1');
  } catch (e) { /* storage blocked: show the intro */ }

  const fxCanvas = $('#fx');
  if (firstVisit && window.CRIntro) {
    lenis && lenis.stop();
    window.CRIntro.run({
      onReveal: () => {
        loader.style.pointerEvents = 'none';
        intro.play();
        lenis && lenis.start();
      },
    });
  } else {
    loader.remove();
    fxCanvas.remove();
    intro.play();
  }

  // Hero name drifts up as you leave
  gsap.to('.hero__name', {
    yPercent: -18, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Statement: words light up as you scroll
  $$('[data-words]').forEach((el) => {
    gsap.fromTo($$('.word', el), { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.05,
      scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 50%', scrub: 0.6 },
    });
  });

  // Count-up numbers
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(obj, { v: to, duration: 2, ease: 'expo.out', onUpdate: () => { el.textContent = Math.round(obj.v); } }),
    });
  });

  // Section titles: words rise from a mask
  $$('[data-split-lines]').forEach((el) => {
    gsap.from($$('.char', el), {
      yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // Contact headline: letters rise
  $$('.contact__big .line').forEach((line, i) => {
    gsap.from($$('.char', line), {
      yPercent: 115, duration: 1.4, ease: 'expo.out', stagger: 0.025, delay: i * 0.1,
      scrollTrigger: { trigger: '.contact__big', start: 'top 85%' },
    });
  });

  // Generic fade up (outside the hero)
  $$('.fade-up').filter((el) => !el.closest('.hero')).forEach((el) => {
    gsap.from(el, {
      y: 36, opacity: 0, duration: 1.3, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  // Press marquee: endless loop that speeds up with scroll velocity
  const marquee = gsap.to('#marquee', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
  if (lenis) {
    lenis.on('scroll', ({ velocity }) => {
      gsap.to(marquee, { timeScale: 1 + Math.min(Math.abs(velocity) / 6, 5), duration: 0.3, overwrite: true });
      gsap.to(marquee, { timeScale: 1, duration: 1.2, delay: 0.3 });
    });
  }

  // Venture cards: sticky stack on desktop, fade in on mobile
  const cards = $$('.stack .card');
  cards.forEach((card, i) => card.style.setProperty('--i', i));
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const navH = $('#nav').offsetHeight;
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: 0.93, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: `top ${navH + (i + 1) * 14}px`, scrub: true },
      });
    });
  });
  mm.add('(max-width: 900px)', () => {
    cards.forEach((card) => {
      gsap.from(card, { y: 60, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 90%' } });
    });
  });

  // Video grows into place
  gsap.fromTo('#video', { scale: 0.86 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '#video', start: 'top bottom', end: 'top 25%', scrub: true },
  });

  // Images: wipe reveal + gentle parallax
  $$('.reveal-media').filter((el) => el.id !== 'video').forEach((wrap) => {
    const img = $('img', wrap);
    gsap.fromTo(wrap, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.out',
      scrollTrigger: { trigger: wrap, start: 'top 88%' },
    });
    gsap.fromTo(img, { scale: 1.25 }, {
      scale: 1, duration: 1.8, ease: 'expo.out',
      scrollTrigger: { trigger: wrap, start: 'top 88%' },
    });
    gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Journey rows: line draws, then text rises
  $$('.row').forEach((row) => {
    const line = document.createElement('span');
    line.className = 'row__line';
    row.prepend(line);
    const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 90%' } });
    tl.from(line, { scaleX: 0, duration: 1.4, ease: 'expo.out' })
      .from($$('.row__n, h3, p', row), { y: 24, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06 }, 0.1);
  });

  // Magnetic buttons
  if (finePointer) {
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  // Custom cursor
  if (finePointer) {
    const cursor = $('#cursor');
    const label = $('#cursorLabel');
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' });
    window.addEventListener('mousemove', (e) => { cx(e.clientX); cy(e.clientY); cursor.classList.remove('is-hidden'); });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-cursor]');
      if (target) {
        label.textContent = target.dataset.cursor;
        cursor.classList.add('is-label');
      } else {
        cursor.classList.remove('is-label');
      }
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();

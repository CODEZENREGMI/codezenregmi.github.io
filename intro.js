/*
  Opening sequence.
  1. The portrait rises out of the dark with an ember aura while the counter runs to 100.
  2. The body breaks apart from the chest outward: every piece becomes ash or a black bat,
     and the bats fly out over the page as the portfolio is revealed.
  Exposes window.CRIntro.run({ onReveal, onDone }).
*/
(() => {
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  // A bat seen from behind; `w` is the wing beat from -1 (down) to 1 (up).
  function drawBat(ctx, w) {
    const tipY = -6 - 9 * w;
    const midY = -2 - 4 * w;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.quadraticCurveTo(-5, midY - 3, -15, tipY);
    ctx.quadraticCurveTo(-12.5, tipY + 5, -10, midY + 4);
    ctx.quadraticCurveTo(-7.5, midY + 2.5, -5, midY + 6);
    ctx.quadraticCurveTo(-3, 2, 0, 4);
    ctx.quadraticCurveTo(3, 2, 5, midY + 6);
    ctx.quadraticCurveTo(7.5, midY + 2.5, 10, midY + 4);
    ctx.quadraticCurveTo(12.5, tipY + 5, 15, tipY);
    ctx.quadraticCurveTo(5, midY - 3, 0, -3);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0.5, 2.3, 4.2, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-1.8, -2.8);
    ctx.lineTo(-1.4, -6.4);
    ctx.lineTo(-0.3, -3.6);
    ctx.lineTo(0.3, -3.6);
    ctx.lineTo(1.4, -6.4);
    ctx.lineTo(1.8, -2.8);
    ctx.fill();
  }

  function run({ onReveal, onDone }) {
    const gsap = window.gsap;
    const loader = document.getElementById('loader');
    const stage = document.getElementById('loaderStage');
    const photo = document.getElementById('loaderPhoto');
    const glow = document.getElementById('loaderGlow');
    const countEl = document.getElementById('loaderCount');
    const meta = loader.querySelectorAll('.loader__inner > *');
    const fx = document.getElementById('fx');
    const ctx = fx.getContext('2d');

    const small = window.innerWidth < 700;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      fx.width = Math.round(W * dpr);
      fx.height = Math.round(H * dpr);
      fx.style.width = `${W}px`;
      fx.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let finished = false;
    let revealed = false;
    const reveal = () => { if (!revealed) { revealed = true; onReveal(); } };
    const finish = () => {
      if (finished) return;
      finished = true;
      reveal();
      window.removeEventListener('resize', resize);
      loader.remove();
      fx.remove();
      onDone && onDone();
    };
    // Safety net: never trap anyone behind the intro.
    const safety = setTimeout(finish, 12000);

    /* ---------- Particles ---------- */
    const embers = [];
    const ash = [];
    const bats = [];
    let emitEmbers = true;
    let photoLayer = null; // { canvas, x, y, w, h }

    const spawnEmber = () => {
      const r = stage.getBoundingClientRect();
      embers.push({
        x: r.left + rand(0.05, 0.95) * r.width,
        y: r.top + rand(0.25, 0.95) * r.height,
        vx: rand(-12, 12),
        vy: rand(-70, -25),
        size: rand(0.8, 2.4),
        life: 0,
        max: rand(1.4, 3),
        hot: Math.random() < 0.7,
      });
    };

    let last = performance.now();
    let emberAcc = 0;
    let raf = 0;
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, W, H);

      // Embers drifting up through the aura
      if (emitEmbers) {
        emberAcc += dt * (small ? 22 : 40);
        while (emberAcc > 1) { spawnEmber(); emberAcc -= 1; }
      }
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += dt;
        if (e.life > e.max) { embers.splice(i, 1); continue; }
        e.vx += Math.sin(now / 500 + i) * 8 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        const a = Math.sin((e.life / e.max) * Math.PI);
        ctx.fillStyle = e.hot ? `rgba(255, 110, 60, ${a * 0.9})` : `rgba(255, 236, 226, ${a * 0.6})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, TAU);
        ctx.fill();
      }

      // What is left of the body (fades out completely as it breaks apart)
      if (photoLayer && !photoLayer.gone) {
        const p = Math.min(1, (now - dissolveStart) / DISSOLVE_MS);
        ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
        ctx.drawImage(photoLayer.canvas, photoLayer.x, photoLayer.y, photoLayer.w, photoLayer.h);
        ctx.globalAlpha = 1;
        dissolveStep(now);
        if (p >= 1) {
          cursor = cells.length;
          photoLayer.gone = true;
        }
      }

      // Ash
      for (let i = ash.length - 1; i >= 0; i--) {
        const p = ash[i];
        p.life += dt;
        if (p.life > p.max) { ash.splice(i, 1); continue; }
        p.vx *= 1 + dt * 0.8;
        p.vy -= 60 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = 1 - p.life / p.max;
        ctx.fillStyle = p.col;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // Bats
      ctx.fillStyle = '#0e0d0c';
      for (let i = bats.length - 1; i >= 0; i--) {
        const b = bats[i];
        b.age += dt;
        b.vx += Math.sin(now / 420 + b.seed) * 90 * dt;
        b.vy -= 70 * dt;
        const boost = 1 + dt * b.accel;
        b.vx *= boost;
        b.vy *= boost;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.s = Math.min(b.sMax, b.s + dt * b.grow);
        b.flap += dt * b.flapSpeed;
        if (b.age > 6 || b.y < -80 || b.x < -80 || b.x > W + 80 || b.y > H + 80) { bats.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.max(-0.6, Math.min(0.6, b.vx * 0.0012)));
        ctx.scale(b.s, b.s);
        drawBat(ctx, Math.sin(b.flap));
        ctx.restore();
      }

      const dissolving = photoLayer && cursor < cells.length;
      if (!emitEmbers && !dissolving && embers.length === 0 && ash.length === 0 && bats.length === 0 && photoLayer) {
        clearTimeout(safety);
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    /* ---------- Dissolve: body -> ash + bats ---------- */
    let cells = [];
    let cursor = 0;
    let dissolveStart = 0;
    const DISSOLVE_MS = small ? 1500 : 1800;

    const startDissolve = () => {
      const r = photo.getBoundingClientRect();
      const cw = Math.max(1, Math.round(r.width * dpr));
      const ch = Math.max(1, Math.round(r.height * dpr));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const pctx = canvas.getContext('2d', { willReadFrequently: true });
      pctx.drawImage(photo, 0, 0, cw, ch);
      let data = null;
      try { data = pctx.getImageData(0, 0, cw, ch).data; } catch (e) { data = null; }

      photoLayer = { canvas, ctx: pctx, x: r.left, y: r.top, w: r.width, h: r.height };
      photo.style.visibility = 'hidden';

      // Break the body into cells; the chest goes first, the edges last.
      const cell = small ? 8 : 7;
      const cx = r.left + r.width * 0.5;
      const cy = r.top + r.height * 0.45;
      const maxD = Math.hypot(r.width * 0.55, r.height * 0.6);
      for (let y = 0; y < r.height; y += cell) {
        for (let x = 0; x < r.width; x += cell) {
          let alpha = 255;
          let shade = 40;
          if (data) {
            const px = Math.min(cw - 1, Math.round((x + cell / 2) * dpr));
            const py = Math.min(ch - 1, Math.round((y + cell / 2) * dpr));
            const k = (py * cw + px) * 4;
            alpha = data[k + 3];
            shade = data[k];
          }
          if (alpha < 3) continue;
          const gx = r.left + x;
          const gy = r.top + y;
          const d = Math.hypot(gx - cx, gy - cy) / maxD;
          cells.push({ x, y, gx, gy, shade, solid: alpha >= 50, t: 0.6 * d + 0.4 * Math.random() });
        }
      }
      cells.sort((a, b) => a.t - b.t);
      photoLayer.cell = cell;
      photoLayer.cx = cx;
      photoLayer.cy = cy;
      const solidCells = cells.reduce((n, c) => n + (c.solid ? 1 : 0), 0);
      photoLayer.batChance = (small ? 80 : 150) / Math.max(1, solidCells);
      dissolveStart = performance.now();
    };

    const dissolveStep = (now) => {
      if (cursor >= cells.length) return;
      const p = Math.min(1, (now - dissolveStart) / DISSOLVE_MS);
      const eased = 1 - Math.pow(1 - p, 1.6);
      const { ctx: pctx, cell, cx, cy, batChance } = photoLayer;
      while (cursor < cells.length && cells[cursor].t <= eased * 1.0001) {
        const c = cells[cursor++];
        pctx.clearRect(c.x * dpr - 1, c.y * dpr - 1, cell * dpr + 2, cell * dpr + 2);
        if (!c.solid) continue; // faint edge pixels just vanish
        const dx = c.gx - cx;
        const dy = c.gy - cy;
        const len = Math.hypot(dx, dy) || 1;
        if (Math.random() < batChance) {
          const speed = rand(70, 190);
          bats.push({
            x: c.gx + cell / 2,
            y: c.gy + cell / 2,
            vx: (dx / len) * speed + rand(-30, 30),
            vy: (dy / len) * speed * 0.6 - rand(40, 120),
            s: 0.15,
            sMax: rand(small ? 0.5 : 0.6, small ? 1.1 : 1.6),
            grow: rand(0.9, 1.6),
            flap: rand(0, TAU),
            flapSpeed: rand(16, 24),
            accel: rand(0.6, 1.3),
            seed: rand(0, 100),
            age: 0,
          });
        } else if (Math.random() < 0.45) {
          const v = Math.max(8, Math.min(70, c.shade * 0.5));
          ash.push({
            x: c.gx + rand(0, cell),
            y: c.gy + rand(0, cell),
            vx: (dx / len) * rand(10, 60),
            vy: rand(-40, -5),
            size: rand(1.5, cell * 0.7),
            life: 0,
            max: rand(0.6, 1.4),
            col: `rgb(${v}, ${v * 0.95}, ${v * 0.92})`,
          });
        }
      }
    };

    raf = requestAnimationFrame(frame);

    /* ---------- Timeline ---------- */
    const counter = { v: 0 };
    const ready = Promise.race([
      photo.decode ? photo.decode().catch(() => {}) : Promise.resolve(),
      new Promise((r) => setTimeout(r, 2500)),
    ]);

    ready.then(() => {
      const hasPhoto = photo.complete && photo.naturalWidth > 0;
      if (!hasPhoto) stage.style.display = 'none';

      gsap.timeline()
        .fromTo(glow, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 2.2, ease: 'power2.out' }, 0)
        .fromTo(photo,
          { opacity: 0, y: 40, scale: 1.06, filter: 'blur(22px) brightness(0)' },
          { opacity: 1, y: 0, scale: 1, filter: 'blur(0px) brightness(1)', duration: 2.2, ease: 'expo.out' }, 0.15)
        .fromTo(meta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1 }, 0.2)
        .to(counter, {
          v: 100, duration: 2.8, ease: 'power2.inOut',
          onUpdate: () => { countEl.textContent = Math.round(counter.v); },
        }, 0.2)
        // Breathing aura while the count runs
        .to(glow, { opacity: 0.7, scale: 1.03, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 1.4)
        // Flash, then the body breaks apart
        .to(glow, { opacity: 1, scale: 1.1, duration: 0.25, ease: 'power2.out' }, 3.1)
        .add(() => {
          emitEmbers = false;
          if (hasPhoto) startDissolve();
        }, 3.3)
        .to(glow, { opacity: 0, scale: 1.2, duration: 0.8, ease: 'power2.in' }, 3.3)
        .to(meta, { opacity: 0, y: -12, duration: 0.5, ease: 'power2.in', stagger: 0.05 }, 3.3)
        .to(loader, { backgroundColor: 'rgba(17, 17, 17, 0)', duration: 1.1, ease: 'power2.inOut' }, 3.5)
        .add(reveal, 3.7)
        .add(() => { if (!hasPhoto) { clearTimeout(safety); finish(); } }, 4.6);
    });
  }

  window.CRIntro = { run };
})();

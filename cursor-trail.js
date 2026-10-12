/*
  Cursor trail: coloured ribbons follow the mouse and shed little circles,
  squares and triangles. When the mouse rests, the ribbons keep crackling
  around the pointer like small lightning bolts. Steps aside while the mouse
  button is held and while the pointer is over highlighted text.
  Plain-JS port of the SVGFollower React component.
  Mouse/trackpad only; skipped on touch screens and with reduced motion.
*/
(() => {
  const COLORS = ['#ff6b6b', '#fff200', '#45b7d1', '#96ceb4', '#ffeaa7'];
  const REMOVE_DELAY = 300; // ms a point lives before the tail starts eating it
  const SIZE = 0.65; // overall scale of the ribbons, shapes and how far they fly (1 = original)
  const MAX_SPEED = 9; // caps how wide a fast flick can make the trail
  const IDLE_AFTER = 80; // ms without movement before the crackle starts
  const IDLE_EVERY = 30; // ms between crackle points (lower = busier)
  const IDLE_RADIUS = 7; // px the crackle reaches around the pointer
  const IDLE_DRIFT = 0.35; // how far resting sparks spread out (1 = same as when moving)
  const SVG_NS = 'http://www.w3.org/2000/svg';

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stage = document.createElementNS(SVG_NS, 'svg');
  stage.setAttribute('class', 'trail');
  stage.setAttribute('aria-hidden', 'true');
  document.body.appendChild(stage);

  const randomDrift = () => (Math.random() - 0.5) * 3 * SIZE;

  class Follower {
    constructor(color) {
      this.color = color;
      this.points = [];
      this.spark = Math.random() * Math.PI * 2; // heading of this ribbon's idle crackle
      this.line = document.createElementNS(SVG_NS, 'path');
      this.line.style.fill = color;
      this.line.style.stroke = color;
      this.line.style.strokeWidth = '1';
      stage.appendChild(this.line);
    }

    add(position, shapeChance = 0.3, driftScale = 1) {
      const direction = { x: 0, y: 0 };
      if (this.points[0]) {
        direction.x = (position.x - this.points[0].position.x) * 0.25;
        direction.y = (position.y - this.points[0].position.y) * 0.25;
        const speed = Math.hypot(direction.x, direction.y);
        if (speed > MAX_SPEED) {
          direction.x *= MAX_SPEED / speed;
          direction.y *= MAX_SPEED / speed;
        }
      }
      const point = {
        position,
        time: Date.now(),
        drift: {
          x: (randomDrift() + (direction.x / 2) * SIZE) * driftScale,
          y: (randomDrift() + (direction.y / 2) * SIZE) * driftScale,
        },
        age: 0,
        direction,
      };

      const chance = Math.random();
      if (chance < shapeChance / 3) this.makeCircle(point);
      else if (chance < (shapeChance / 3) * 2) this.makeSquare(point);
      else if (chance < shapeChance) this.makeTriangle(point);

      this.points.unshift(point);
    }

    // Walks the points out and back to build a ribbon whose width follows the speed.
    createLine() {
      const pts = this.points;
      if (!pts.length) return '';
      const path = ['M'];
      let forward = true;
      let i = 0;
      while (i >= 0) {
        const p = pts[i];
        const offsetX = p.direction.x * ((i - pts.length) / pts.length) * 0.6 * SIZE;
        const offsetY = p.direction.y * ((i - pts.length) / pts.length) * 0.6 * SIZE;
        const x = p.position.x + (forward ? offsetY : -offsetY);
        const y = p.position.y + (forward ? offsetX : -offsetX);
        p.age += 0.2;
        path.push(x + p.drift.x * p.age, y + p.drift.y * p.age);
        i += forward ? 1 : -1;
        if (i === pts.length) {
          i--;
          forward = false;
        }
      }
      return path.join(' ');
    }

    trim() {
      // Drop every point past its lifetime so the tail stays short at any mouse speed.
      const cutoff = Date.now() - REMOVE_DELAY;
      while (this.points.length && this.points[this.points.length - 1].time < cutoff) this.points.pop();
      this.line.setAttribute('d', this.createLine());
    }

    makeCircle(point) {
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('r', String((Math.abs(point.direction.x) + Math.abs(point.direction.y)) * SIZE));
      circle.setAttribute('cx', '0');
      circle.setAttribute('cy', '0');
      this.launch(circle, point);
    }

    makeSquare(point) {
      const size = (Math.abs(point.direction.x) + Math.abs(point.direction.y)) * 1.5 * SIZE;
      const square = document.createElementNS(SVG_NS, 'rect');
      square.setAttribute('width', String(size));
      square.setAttribute('height', String(size));
      this.launch(square, point);
    }

    makeTriangle(point) {
      const size = (Math.abs(point.direction.x) + Math.abs(point.direction.y)) * 1.5 * SIZE;
      const triangle = document.createElementNS(SVG_NS, 'polygon');
      triangle.setAttribute('points', `0,0 ${size},${size / 2} 0,${size}`);
      this.launch(triangle, point);
    }

    // Fling a shape off the trail, shrinking and spinning it away.
    launch(shape, point) {
      shape.style.fill = this.color;
      shape.style.transform = `translate(${point.position.x}px, ${point.position.y}px)`;
      shape.style.transition = 'transform 0.5s ease-out';
      stage.appendChild(shape);
      const toX = point.position.x + (point.direction.x * Math.random() * 20 + point.drift.x * Math.random() * 10) * SIZE;
      const toY = point.position.y + (point.direction.y * Math.random() * 20 + point.drift.y * Math.random() * 10) * SIZE;
      setTimeout(() => {
        shape.style.transform = `translate(${toX}px, ${toY}px) scale(0) rotate(${Math.random() * 360}deg)`;
        setTimeout(() => shape.remove(), 500);
      }, 10);
    }
  }

  const followers = COLORS.map((color) => new Follower(color));
  const mouse = { x: 0, y: 0, inside: false, lastMove: 0, down: false };
  let lastIdle = 0;

  // Get out of the way while the mouse button is held, or while the pointer is
  // over highlighted text (so it never covers what someone is reading or copying).
  let hidden = false;
  const SELECTION_PAD = 12; // px around highlighted text that still counts as "over" it
  const overSelection = () => {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !sel.toString().trim()) return false;
    for (let i = 0; i < sel.rangeCount; i++) {
      for (const r of sel.getRangeAt(i).getClientRects()) {
        if (mouse.x >= r.left - SELECTION_PAD && mouse.x <= r.right + SELECTION_PAD &&
            mouse.y >= r.top - SELECTION_PAD && mouse.y <= r.bottom + SELECTION_PAD) return true;
      }
    }
    return false;
  };
  const updateHidden = () => {
    const next = mouse.down || overSelection();
    if (next === hidden) return;
    hidden = next;
    stage.classList.toggle('is-off', hidden);
    if (hidden) followers.forEach((f) => { f.points.length = 0; });
  };
  // The button was let go somewhere we didn't hear about (outside the window,
  // at the end of an image/link drag, while switching apps): show the trail again.
  const release = () => {
    if (!mouse.down) return;
    mouse.down = false;
    updateHidden();
  };

  // Mouse at rest: each ribbon jitters around the pointer in sharp zig-zags.
  const crackle = (now) => {
    if (hidden || !mouse.inside || now - mouse.lastMove < IDLE_AFTER || now - lastIdle < IDLE_EVERY) return;
    lastIdle = now;
    followers.forEach((f) => {
      f.spark += (Math.random() - 0.5) * 2.6;
      const r = IDLE_RADIUS * (0.35 + Math.random() * 0.65);
      f.add({ x: mouse.x + Math.cos(f.spark) * r, y: mouse.y + Math.sin(f.spark) * r }, 0.04, IDLE_DRIFT);
    });
  };

  // Runs while there is a trail to draw or the pointer is on the page.
  let raf = 0;
  const tick = (now) => {
    crackle(now);
    let alive = false;
    followers.forEach((f) => {
      f.trim();
      if (f.points.length) alive = true;
    });
    raf = alive || mouse.inside ? requestAnimationFrame(tick) : 0;
  };

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.inside = true;
    mouse.lastMove = performance.now();
    // Every move reports which buttons are pressed: if none are, any "held" state is stale.
    if (mouse.down && (e.buttons & 1) === 0) mouse.down = false;
    updateHidden();
    if (!hidden) followers.forEach((f) => f.add({ x: e.clientX, y: e.clientY }));
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    mouse.down = true;
    updateHidden();
  });
  window.addEventListener('mouseup', release);
  window.addEventListener('dragend', release);
  window.addEventListener('drop', release);
  window.addEventListener('pointercancel', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
  document.addEventListener('selectionchange', updateHidden);
  // Highlighted text moves under a still pointer when the page scrolls.
  window.addEventListener('scroll', updateHidden, { passive: true });

  // Pointer left the window: let the trail fade out and stop.
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) mouse.inside = false;
  });
  window.addEventListener('blur', () => {
    mouse.inside = false;
    release();
  });
})();

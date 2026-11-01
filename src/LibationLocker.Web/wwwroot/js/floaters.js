document.addEventListener("DOMContentLoaded", () => {
  const floaters = Array.from(document.querySelectorAll(".bg-floater"));
  if (!floaters.length) return;

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  const particles = floaters.map((el) => ({
    el,
    x: Math.random() * W(),
    y: Math.random() * H(),
    angle: Math.random() * Math.PI * 2,
    speed: 0.6 + Math.random() * 0.7,
    rot: (Math.random() - 0.5) * 40,
    rotSpeed: (Math.random() - 0.5) * 0.08,
    steer: 0
  }));

  let prev = performance.now();

  function tick(now) {
    const dt = Math.min(now - prev, 50);
    prev = now;
    const scale = dt / 16.667;
    const vw = W();
    const vh = H();

    for (const p of particles) {
      p.steer += (Math.random() - 0.5) * 0.015 * scale;
      p.steer *= 0.97;
      p.angle += p.steer;
      p.x += Math.cos(p.angle) * p.speed * scale;
      p.y += Math.sin(p.angle) * p.speed * scale;
      p.rot += p.rotSpeed * scale;

      const ew = p.el.offsetWidth  || 80;
      const eh = p.el.offsetHeight || 80;
      if (p.x >  vw + ew) p.x = -ew;
      if (p.x < -ew)      p.x =  vw + ew;
      if (p.y >  vh + eh) p.y = -eh;
      if (p.y < -eh)      p.y =  vh + eh;

      p.el.style.transform = `translate(${p.x}px,${p.y}px) rotate(${p.rot}deg)`;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
});

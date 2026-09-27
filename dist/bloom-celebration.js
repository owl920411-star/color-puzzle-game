/* CRAYON BLOOM RC — presentation-only, bounded mascot celebrations. */
(function (global) {
  'use strict';
  const PARTICLES = 12;
  const SHAPES = [
    '<path d="m10 1 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.9-5.3 2.9 1-6L.4 7.3l6-.9Z"/>',
    '<path d="M10 17S1 12 1 6.5C1 1.2 7-1 10 4c3-5 9-2.8 9 2.5C19 12 10 17 10 17Z"/>',
    '<path d="M10 6C4-3 0 4 6 9c-9 1-6 10 1 5-1 9 8 8 7 0 8 5 10-4 2-5 6-6-1-12-6-3Z"/>'
  ];
  const COLORS = ['#ee92ae', '#e5ba56', '#8ecac0', '#b29bd5', '#88bde1'];

  function create(options) {
    const host = options && options.host;
    if (!host || !host.ownerDocument) throw new TypeError('BloomCelebration requires a host element');
    const doc = host.ownerDocument;
    const root = doc.createElement('div');
    root.className = 'bloom-celebration';
    root.setAttribute('aria-hidden', 'true');
    root.hidden = true;
    const rainbow = doc.createElement('span');
    rainbow.className = 'bloom-celebration-rainbow';
    const cutin = doc.createElement('div');
    cutin.className = 'bloom-celebration-cutin';
    const hero = doc.createElement('img');
    hero.className = 'bloom-celebration-hero';
    hero.alt = ''; hero.width = 100; hero.height = 75;
    hero.decoding = 'async'; hero.draggable = false;
    hero.src = 'assets/bloom-happy.webp?v=cb-rc2';
    const chick = doc.createElement('img');
    chick.className = 'bloom-celebration-chick';
    chick.alt = ''; chick.width = 76; chick.height = 76;
    chick.decoding = 'async'; chick.draggable = false;
    chick.src = 'assets/bloom-chick.webp?v=cb-rc2';
    const label = doc.createElement('span');
    label.className = 'bloom-celebration-label';
    cutin.appendChild(hero); cutin.appendChild(chick); cutin.appendChild(label);
    root.appendChild(rainbow); root.appendChild(cutin);
    for (let i = 0; i < PARTICLES; i += 1) {
      const dot = doc.createElement('span');
      dot.className = 'bloom-celebration-doodle';
      dot.innerHTML = '<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">' + SHAPES[i % 3] + '</svg>';
      const angle = (i / PARTICLES) * Math.PI * 2;
      dot.style.setProperty('--dx', Math.round(Math.cos(angle) * (29 + i % 3 * 7)) + 'px');
      dot.style.setProperty('--dy', Math.round(Math.sin(angle) * (31 + i % 4 * 5) - 15) + 'px');
      dot.style.setProperty('--turn', ((i % 2 ? 1 : -1) * (35 + i * 9)) + 'deg');
      dot.style.setProperty('--ink', COLORS[i % COLORS.length]);
      dot.style.setProperty('--delay', (i % 3 * 18) + 'ms');
      root.appendChild(dot);
    }
    host.appendChild(root);
    let stopTimer = null, preloadPromise = null, preloadTimer = null, preloadFinish = null, destroyed = false;
    let prepared = false, heroReady = false, chickReady = false;
    let shown = 0, skipped = 0, lastAt = -Infinity, lastPriority = 0, lastEvent = null;
    const now = () => global.performance && global.performance.now ? global.performance.now() : Date.now();
    const reduced = () => Boolean(options.reduced && options.reduced());
    function stopVisual() {
      if (stopTimer !== null) global.clearTimeout(stopTimer);
      stopTimer = null;
      root.hidden = true;
    }
    function load(image) {
      return new Promise(resolve => {
        if (image.complete) {
          if (!image.naturalWidth) { resolve(false); return; }
        }
        const finish = () => {
          image.onload = null; image.onerror = null;
          if (!image.naturalWidth) { resolve(false); return; }
          if (typeof image.decode === 'function') image.decode().then(() => resolve(true), () => resolve(false));
          else resolve(true);
        };
        image.onload = finish; image.onerror = () => { image.onload = null; image.onerror = null; resolve(false); };
        if (image.complete) finish();
      });
    }
    function preload() {
      if (destroyed) return Promise.resolve(false);
      if (preloadPromise) return preloadPromise;
      preloadPromise = new Promise(resolve => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true; prepared = true; preloadFinish = null;
          if (preloadTimer !== null) global.clearTimeout(preloadTimer);
          preloadTimer = null;
          resolve(heroReady && chickReady);
        };
        preloadFinish = finish;
        preloadTimer = global.setTimeout(finish, 1800);
        Promise.all([
          load(hero).then(ok => { heroReady = ok; }),
          load(chick).then(ok => { chickReady = ok; })
        ]).then(finish, finish);
      });
      return preloadPromise;
    }
    function celebrate(event) {
      event = event || {};
      const combo = Math.max(0, Math.min(99, Number(event.combo) || 0));
      const four = Number(event.lines) >= 4, best = Boolean(event.best);
      const milestone = combo === 2 || combo === 3 || combo === 4 || (combo >= 6 && combo % 2 === 0);
      const isChick = !best && !four && combo === 2;
      const priority = best ? 6 : four ? 5 : Math.min(combo, 4);
      const at = now();
      if (destroyed || !prepared || (!best && !four && !milestone) || (isChick ? !chickReady : !heroReady)) {
        skipped += 1; return false;
      }
      if (at - lastAt < 1050 && priority <= lastPriority) { skipped += 1; return false; }
      stopVisual();
      const quiet = reduced();
      const strength = best ? 3 : four ? 4 : Math.min(5, Math.max(1, combo - 1));
      root.dataset.run = String(shown % 2);
      root.dataset.kind = best ? 'best' : four ? 'four' : isChick ? 'chick' : 'hero';
      root.dataset.strength = String(strength);
      root.classList.toggle('is-reduced', quiet);
      root.style.setProperty('--bloom-scale', String(1 + Math.min(3, Math.max(0, combo - 4)) * .025));
      label.textContent = best ? '새 기록!' : four ? '활짝!' : combo === 2 ? '좋아!' : combo === 3 ? '멋져!' : 'BLOOM!';
      hero.hidden = isChick; chick.hidden = !isChick;
      root.hidden = false;
      lastAt = at; lastPriority = priority; shown += 1;
      lastEvent = {combo, lines: Number(event.lines) || 0, best, at, label: label.textContent};
      stopTimer = global.setTimeout(stopVisual, quiet ? 450 : 820);
      return true;
    }
    function clear() { stopVisual(); lastAt = -Infinity; lastPriority = 0; }
    function destroy() {
      if (destroyed) return;
      destroyed = true; clear();
      if (preloadFinish) preloadFinish();
      if (preloadTimer !== null) global.clearTimeout(preloadTimer);
      preloadTimer = null;
      hero.onload = hero.onerror = chick.onload = chick.onerror = null;
      if (root.parentNode) root.parentNode.removeChild(root);
    }
    function stats() {
      return {active: !root.hidden && !destroyed, prepared, heroReady, chickReady,
        timers: Number(stopTimer !== null) + Number(preloadTimer !== null),
        particles: PARTICLES, children: root.childElementCount, shown, skipped, lastEvent, destroyed};
    }
    return {preload, celebrate, clear, destroy, stats};
  }
  global.BloomCelebration = Object.freeze({create});
})(typeof window === 'undefined' ? globalThis : window);

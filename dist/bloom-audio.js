/* CRAYON BLOOM RC — original procedural score and paper/toy-instrument SFX.
 * No samples, third-party compositions, network requests, or input handlers.
 */
(function (global) {
  'use strict';
  const LIMIT = 28, MUSIC_LIMIT = 16, AHEAD = 0.15, TICK = 80;
  const CHORDS = [[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,67]];
  // Eight hand-authored two-bar motifs. Four arrangements give a 128-beat cycle.
  const MOTIFS = [[0,2,1,4,2,1,0,-1],[1,3,2,4,3,1,2,-1],[2,4,3,1,0,2,1,-1],[1,2,4,3,2,0,1,-1],
    [4,2,3,1,2,4,1,-1],[2,1,0,2,3,1,4,-1],[1,3,4,2,1,0,2,-1],[2,4,3,1,0,1,0,-1]];
  const SCALE = [0,2,4,7,9];
  let context = null, master = null, musicBus = null, effectsBus = null, noiseBuffer = null;
  let timer = null, scene = 'off', options = {sound:true,bgm:true,sfx:true};
  let unlocked = false, destroyed = false, resumePending = false, resumeBlocked = false;
  let beat = 0, nextBeatAt = 0, created = 0, peak = 0, scheduled = 0, dropped = 0;
  const voices = new Set();
  let musicScheduled = 0, effectsScheduled = 0;
  const effectEvents = {};
  const hidden = () => Boolean(global.document && global.document.hidden);
  const active = () => !destroyed && unlocked && options.sound && !hidden() && (scene === 'home' || scene === 'game' || scene === 'over');
  const musicActive = () => active() && options.bgm && scene !== 'over';
  const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);

  function disconnect(voice) {
    if (!voices.delete(voice)) return;
    voice.source.onended = null;
    for (const node of voice.nodes) { try { node.disconnect(); } catch (_) {} }
  }
  function silence(category) {
    for (const voice of Array.from(voices)) {
      if (category && voice.category !== category) continue;
      try { voice.source.stop(); } catch (_) {}
      disconnect(voice);
    }
  }
  function cancelSchedule() {
    if (timer !== null) global.clearTimeout(timer);
    timer = null;
  }
  function available(category) {
    if (!context || !active() || context.state !== 'running') return false;
    let musicCount = 0;
    for (const voice of voices) if (voice.category === 'music') musicCount += 1;
    if (voices.size >= LIMIT || (category === 'music' && musicCount >= MUSIC_LIMIT)) { dropped += 1; return false; }
    return true;
  }
  function voice(kind, hz, at, length, volume, category, endHz) {
    if (!available(category)) return;
    let source, gain, filter;
    try {
      source = kind === 'paper' ? context.createBufferSource() : context.createOscillator();
      gain = context.createGain();
      const nodes = [source,gain];
      if (kind === 'paper') {
        source.buffer = noiseBuffer;
        filter = context.createBiquadFilter();filter.type = 'bandpass';filter.frequency.setValueAtTime(hz,at);filter.Q.setValueAtTime(0.65,at);
        source.connect(filter);filter.connect(gain);nodes.push(filter);
      } else {
        source.type = kind === 'pluck' ? 'triangle' : 'sine';
        source.frequency.setValueAtTime(hz,at);
        if (endHz) source.frequency.exponentialRampToValueAtTime(endHz,at + length);
        source.connect(gain);
      }
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at + 0.007);
      gain.gain.exponentialRampToValueAtTime(0.0001,at + length);
      gain.connect(category === 'music' ? musicBus : effectsBus);
      const entry = {source,nodes,category};voices.add(entry);peak = Math.max(peak,voices.size);scheduled += 1;
      source.onended = () => disconnect(entry);
      source.start(at);source.stop(at + length + 0.025);
      if (category === 'music') musicScheduled += 1; else effectsScheduled += 1;
    } catch (_) {
      if (source) for (const entry of Array.from(voices)) if (entry.source === source) disconnect(entry);
      for (const node of [source,gain,filter]) if (node) { try { node.disconnect(); } catch (_) {} }
    }
  }
  function note(midi, at, length, volume, category, kind) {
    voice(kind || 'bell',frequency(midi),at,length,volume,category);
  }
  function score(b, at, beatLength) {
    const game = scene === 'game', position = b % 128, bar = Math.floor(position / 4);
    const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length], part = position % 4;
    const motif = MOTIFS[Math.floor(position / 8) % MOTIFS.length];
    const degree = motif[position % 8], variation = Math.floor(position / 32);
    if (degree >= 0 && (game || part !== 3)) {
      const root = chord[0] + 12, melody = root + SCALE[(degree + (variation === 2 ? 1 : 0)) % SCALE.length];
      note(melody,at,0.47,game ? 0.13 : 0.115,'music');
      // A quiet upper partial gives a small wooden/toy mallet rather than a pure beep.
      note(melody + 12,at,0.11,0.015,'music');
      if (game && part === 2 && bar % 2 === 1) note(root + SCALE[(degree + 1) % 5],at + beatLength / 2,0.24,0.065,'music','pluck');
    }
    if (part === 0 || part === 2) {
      note(chord[part === 0 ? 0 : 2] - 12,at,0.4,0.10,'music','pluck');
      note(chord[1],at + 0.018,0.3,0.045,'music','pluck');
    }
    if (game && (part === 1 || part === 3)) voice('paper',1800,at,0.045,0.07,'music');
    if (!game && part === 3 && bar % 4 === 3) voice('paper',1100,at,0.065,0.035,'music');
  }
  function tick() {
    timer = null;
    if (!musicActive() || context.state !== 'running') return;
    const now = context.currentTime, beatLength = 60 / (scene === 'game' ? 101 : 86);
    // A stalled tab never catches up by bursting all the missed notes.
    if (nextBeatAt < now - AHEAD) nextBeatAt = now + 0.025;
    let count = 0;
    while (nextBeatAt < now + AHEAD && count < 2) { score(beat,nextBeatAt,beatLength);beat = (beat + 1) % 128;nextBeatAt += beatLength;count += 1; }
    timer = global.setTimeout(tick,TICK);
  }
  function sync() {
    if (!context || destroyed) return;
    if (!active()) {
      cancelSchedule();silence();
      if (context.state === 'running' && typeof context.suspend === 'function') {
        try { Promise.resolve(context.suspend()).then(() => { if (active()) sync(); },() => {}); } catch (_) {}
      }
      return;
    }
    if (context.state !== 'running') {
      if (!resumePending && !resumeBlocked && typeof context.resume === 'function') {
        resumePending = true;
        try {
          Promise.resolve(context.resume()).then(() => { resumePending = false;if (context.state !== 'running') resumeBlocked = true;sync(); },() => { resumePending = false;resumeBlocked = true; });
        } catch (_) { resumePending = false;resumeBlocked = true; }
      }
      return;
    }
    if (!musicActive()) { cancelSchedule();silence('music'); }
    else if (timer === null) { nextBeatAt = context.currentTime + 0.025;tick(); }
    if (!options.sfx) silence('effect');
  }
  function makeContext() {
    const Audio = global.AudioContext || global.webkitAudioContext;
    if (!Audio) return false;
    try {
      context = new Audio();created += 1;
      master = context.createGain();musicBus = context.createGain();effectsBus = context.createGain();
      master.gain.value = 0.64;musicBus.gain.value = 0.30;effectsBus.gain.value = 0.65;
      musicBus.connect(master);effectsBus.connect(master);master.connect(context.destination);
      noiseBuffer = context.createBuffer(1,Math.ceil(context.sampleRate * 0.4),context.sampleRate);
      const data = noiseBuffer.getChannelData(0);let seed = 20491, smooth = 0;
      for (let i = 0; i < data.length; i += 1) { seed = (seed * 16807) % 2147483647;smooth = smooth * 0.42 + (seed / 1073741823.5 - 1) * 0.58;data[i] = smooth; }
      return true;
    } catch (_) {
      if (context && typeof context.close === 'function') { try { Promise.resolve(context.close()).catch(() => {}); } catch (_) {} }
      context = null;return false;
    }
  }
  function configure(saved) {
    if (destroyed) return;
    const next = {sound:!saved || saved.sound !== false,bgm:!saved || saved.bgm !== false,sfx:!saved || saved.sfx !== false};
    if (next.sound === options.sound && next.bgm === options.bgm && next.sfx === options.sfx) return;
    options = next;
    sync();
  }
  function unlock() {
    if (destroyed || !options.sound) return false;
    if (!context && !makeContext()) return false;
    unlocked = true;resumeBlocked = false;
    // Resume directly in the gesture, even while a menu/loading scene is paused
    // or an earlier policy-blocked resume promise is still pending.
    if (context.state !== 'running' && typeof context.resume === 'function') {
      resumePending = true;
      try {
        Promise.resolve(context.resume()).then(() => {
          resumePending = false;resumeBlocked = context.state !== 'running';sync();
        },() => { resumePending = false;resumeBlocked = true; });
      } catch (_) { resumePending = false;resumeBlocked = true; }
      return true;
    }
    sync();return true;
  }
  function setScene(next) {
    if (destroyed) return;
    const valid = ['home','game','paused','over','off'].includes(next) ? next : 'off';
    if (valid !== scene) { cancelSchedule();silence();beat = 0;scene = valid; }
    resumeBlocked = false;sync();
  }
  function effect(type, power) {
    if (!options.sfx || !active() || !context || context.state !== 'running') return false;
    const at = context.currentTime + 0.003, strength = Math.max(1,Math.min(6,Number(power) || 1));
    const before = effectsScheduled;
    const chime = (notes,volume=0.16) => notes.forEach((n,i) => note(n,at + i * 0.07,0.24,volume,'effect'));
    if (type === 'move') { voice('paper',2050,at,0.022,0.055,'effect'); }
    else if (type === 'rotate') { voice('paper',2400,at,0.055,0.17,'effect');note(74,at,0.055,0.05,'effect'); }
    else if (type === 'hold') { voice('paper',1300,at,0.13,0.15,'effect');note(72,at + 0.025,0.1,0.075,'effect','pluck'); }
    else if (type === 'drop') { voice('bell',230,at,0.10,0.34,'effect',125);voice('paper',700,at,0.045,0.20,'effect'); }
    else if (type === 'clear') { voice('paper',2100,at,0.15,0.24,'effect');chime([72,76,79],0.13); }
    else if (type === 'combo') { const base = 69 + Math.min(7,strength - 1);chime([base,base + 4,base + 7],0.14); }
    else if (type === 'good' || type === 'success') chime([72,76,81],0.14);
    else if (type === 'bad') { note(67,at,0.14,0.18,'effect','pluck');note(64,at + 0.09,0.16,0.16,'effect','pluck');voice('paper',900,at,0.07,0.1,'effect'); }
    else if (type === 'gameover' || type === 'over') chime([72,69,67,64],0.12);
    else return false;
    const count = effectsScheduled - before;
    if (count) effectEvents[type] = (effectEvents[type] || 0) + count;
    return count > 0;
  }
  function clear() { setScene('off'); }
  function visibility() { resumeBlocked = false;sync(); }
  function destroy() {
    if (destroyed) return;
    clear();destroyed = true;
    if (global.document && global.document.removeEventListener) global.document.removeEventListener('visibilitychange',visibility);
    if (context && typeof context.close === 'function') { try { Promise.resolve(context.close()).catch(() => {}); } catch (_) {} }
    for (const node of [musicBus,effectsBus,master]) if (node) { try { node.disconnect(); } catch (_) {} }
    noiseBuffer = null;
  }
  if (global.document && global.document.addEventListener) global.document.addEventListener('visibilitychange',visibility);
  global.BloomAudio = Object.freeze({configure,unlock,scene:setScene,effect,clear,destroy,
    stats:() => ({scene,contextsCreated:created,contextState:context ? context.state : 'unavailable',voices:voices.size,peakVoices:peak,
      timers:timer === null ? 0 : 1,scheduled,dropped,beat,cycleBeats:128,voiceLimit:LIMIT,unlocked,destroyed,
      sound:options.sound,bgm:options.bgm,sfx:options.sfx,musicScheduled,effectsScheduled,effectEvents:{...effectEvents},
      effectVoices:[...voices].filter(v => v.category === 'effect').length})});
})(window);

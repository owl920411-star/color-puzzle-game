// ============================================================
// GLASSFALL — sand-shatter-fx.js (사막/피라미드 테마)
// 사암 블록 라인 제거 시 모래 붕괴/먼지/플래시/화면 흔들림 이펙트
// glass-shatter-fx.js와 동일한 인터페이스(trigger/update/draw/clear)를
// 그대로 유지해서, 모드 전환 시 FX 인스턴스만 갈아끼우면 되게 만듦.
// ============================================================
//
// 연결 방법은 glass-shatter-fx.js와 완전히 동일:
//
//   import { SandShatterFX } from './sand-shatter-fx.js';
//   const fx = new SandShatterFX(canvas, { cellSize: 24 });
//
//   fx.trigger(clearedCells, lineCount); // 줄 제거 직전 호출
//   fx.update(deltaMs);                  // 매 프레임
//   fx.draw();                           // 매 프레임 (게임 렌더링 이후)
//
// 유리와의 핵심 차이:
//   - 파편이 "튕겨나가는" 대신 "부슬부슬 흘러내림" (속도 느리고 중력 약함)
//   - 파티클 모양: 삼각형(유리조각) → 불규칙 사각/원형(모래 알갱이)
//   - 색상: 청록 계열 → 황토/테라코타/황금 계열
//   - 착지 시 먼지 퍼짐 이펙트 추가 (유리에는 없음)
//   - 4줄(테트리스) 시 "피라미드 붕괴" 전용 대형 연출 추가
// ============================================================

class SandShatterFX {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} opts
   * @param {number} opts.cellSize - 셀 한 칸의 화면 픽셀 크기 (기본 24)
   * @param {number} opts.originX - 게임판 좌측 시작 x좌표 (기본 0)
   * @param {number} opts.originY - 게임판 상단 시작 y좌표 (기본 0)
   * @param {number} opts.maxParticles - 동시 최대 파티클 수 (기본 260)
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = opts.cellSize ?? 24;
    this.originX = opts.originX ?? 0;
    this.originY = opts.originY ?? 0;
    this.maxParticles = opts.maxParticles ?? 260;

    /** @type {SandParticle[]} */
    this.particles = [];
    /** @type {DustPuff[]} */
    this.dustPuffs = [];

    this.shake = { time: 0, duration: 0, magnitude: 0 };
    this.flash = { alpha: 0, decay: 0 };
    this.hitStopMs = 0;

    // 4줄(테트리스) 시 등장하는 "피라미드 붕괴" 대형 연출 상태
    this.collapseBanner = { alpha: 0, scale: 0.8, timeMs: 0, durationMs: 900 };

    // 모래 알갱이 팔레트 (황토 ~ 황금 ~ 테라코타)
    this.palette = [
      'rgba(224, 178, 110, 0.95)',
      'rgba(200, 148, 84, 0.9)',
      'rgba(178, 120, 68, 0.85)',
      'rgba(240, 205, 140, 0.95)',
      'rgba(150, 95, 60, 0.8)',
    ];

    // 먼지 색상 (밝은 베이지, 낮은 채도)
    this.dustColor = 'rgba(214, 190, 160, ALPHA)';
  }

  // ----------------------------------------------------------
  trigger(clearedCells, lineCount = 1) {
    if (!clearedCells || clearedCells.length === 0) return;

    const intensity = this._intensityFor(lineCount);

    for (const cell of clearedCells) {
      this._spawnGrainsAt(cell.col, cell.row, intensity);
      this._spawnDustAt(cell.col, cell.row, intensity);
    }

    // 플래시: 황금빛 모래바람이 훑고 지나가는 느낌 (유리보다 은은하고 김)
    this.flash.alpha = Math.min(0.10 + lineCount * 0.09, 0.5);
    this.flash.decay = 0.0014; // 유리보다 천천히 사라짐 (모래바람은 길게 끈다)

    // 화면 흔들림: 유리보다 낮은 진폭, 대신 좀 더 묵직하고 길게 (돌 붕괴 느낌)
    if (lineCount >= 2) {
      this.shake.duration = 160 + lineCount * 60;
      this.shake.time = this.shake.duration;
      this.shake.magnitude = 1.6 + lineCount * 1.2;
    }

    // 히트스탑: 유리와 동일 기준(3줄+)
    if (lineCount >= 3) {
      this.hitStopMs = lineCount >= 4 ? 110 : 60; // 돌 붕괴라 유리보다 살짝 김
    }

    // 4줄: 피라미드 붕괴 대형 연출 시작
    if (lineCount >= 4) {
      this.collapseBanner.timeMs = 0;
      this.collapseBanner.alpha = 1;
      this.collapseBanner.scale = 0.8;
    }
  }

  _intensityFor(lineCount) {
    const scale = 1 + Math.min(lineCount - 1, 3) * 0.4;
    return {
      countPerCell: Math.round(3 * scale), // 유리보다 알갱이 수는 적게(더 작은 입자라 개수 보정)
      speedMul: scale,
    };
  }

  /** 셀 하나에서 모래 알갱이 파티클 생성 — 튀지 않고 흘러내리는 느낌 */
  _spawnGrainsAt(col, row, intensity) {
    const cx = this.originX + col * this.cellSize + this.cellSize / 2;
    const cy = this.originY + row * this.cellSize + this.cellSize / 2;

    for (let i = 0; i < intensity.countPerCell; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      // 유리와 달리 사방으로 튀기보다 "아래쪽 반원"으로 주로 퍼짐 (중력에 순응하며 무너짐)
      const angle = Math.PI * 0.15 + Math.random() * Math.PI * 0.7; // 대략 아래쪽 부채꼴
      const baseSpeed = (0.02 + Math.random() * 0.05) * intensity.speedMul; // 유리보다 훨씬 느림
      const size = this.cellSize * (0.08 + Math.random() * 0.14); // 유리 파편보다 작은 입자

      this.particles.push(new SandParticle({
        x: cx + (Math.random() - 0.5) * this.cellSize * 0.4,
        y: cy + (Math.random() - 0.5) * this.cellSize * 0.4,
        vx: Math.cos(angle) * baseSpeed,
        vy: Math.sin(angle) * baseSpeed,
        size,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.006, // 유리보다 느리게 회전
        color: this.palette[(Math.random() * this.palette.length) | 0],
        lifeMs: 600 + Math.random() * 500, // 유리보다 오래 남아있음 (부슬부슬 오래 흩날림)
        ageMs: 0,
        // 모래 알갱이는 사각형과 원형을 섞어서 불규칙한 느낌
        shape: Math.random() < 0.5 ? 'square' : 'round',
      }));
    }
  }

  /** 착지/붕괴 지점에 퍼지는 먼지 뭉게구름 (유리 모드에는 없는 사막 전용 연출) */
  _spawnDustAt(col, row, intensity) {
    const cx = this.originX + col * this.cellSize + this.cellSize / 2;
    const cy = this.originY + row * this.cellSize + this.cellSize;

    // 셀당 1개씩만 — 너무 많으면 화면이 뿌예짐
    this.dustPuffs.push(new DustPuff({
      x: cx,
      y: cy,
      radius: this.cellSize * 0.15,
      maxRadius: this.cellSize * (0.6 + intensity.speedMul * 0.3),
      lifeMs: 500 + Math.random() * 300,
      ageMs: 0,
    }));
  }

  // ----------------------------------------------------------
  update(deltaMs) {
    // 모래 알갱이 물리 — 유리보다 훨씬 약한 중력 + 약간의 공기저항(감속)으로
    // "떨어진다"보다 "가라앉는다"는 느낌을 줌
    const gravity = 0.00022;
    const drag = 0.0006;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.ageMs += deltaMs;
      if (p.ageMs >= p.lifeMs) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += gravity * deltaMs;
      p.vx *= Math.max(0, 1 - drag * deltaMs);
      p.vy *= Math.max(0, 1 - drag * deltaMs * 0.4);
      p.x += p.vx * deltaMs;
      p.y += p.vy * deltaMs;
      p.rotation += p.rotationSpeed * deltaMs;
    }

    // 먼지 뭉게구름 — 커지면서 옅어짐
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const d = this.dustPuffs[i];
      d.ageMs += deltaMs;
      if (d.ageMs >= d.lifeMs) {
        this.dustPuffs.splice(i, 1);
        continue;
      }
      const progress = d.ageMs / d.lifeMs;
      d.radius = d.maxRadius * Math.min(1, progress * 1.6);
    }

    if (this.shake.time > 0) {
      this.shake.time = Math.max(0, this.shake.time - deltaMs);
    }
    if (this.flash.alpha > 0) {
      this.flash.alpha = Math.max(0, this.flash.alpha - this.flash.decay * deltaMs);
    }

    // 피라미드 붕괴 배너 진행
    if (this.collapseBanner.alpha > 0) {
      this.collapseBanner.timeMs += deltaMs;
      const t = this.collapseBanner.timeMs / this.collapseBanner.durationMs;
      if (t >= 1) {
        this.collapseBanner.alpha = 0;
      } else {
        // 살짝 튀어나왔다가(overshoot) 서서히 사라짐
        this.collapseBanner.scale = 0.8 + Math.min(1, t * 3) * 0.3;
        this.collapseBanner.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      }
    }

    const stopping = this.hitStopMs > 0;
    if (stopping) {
      this.hitStopMs = Math.max(0, this.hitStopMs - deltaMs);
    }
    return stopping;
  }

  getShakeOffset() {
    if (this.shake.time <= 0) return { x: 0, y: 0 };
    const progress = this.shake.time / this.shake.duration;
    const mag = this.shake.magnitude * progress;
    return {
      x: (Math.random() * 2 - 1) * mag,
      y: (Math.random() * 2 - 1) * mag,
    };
  }

  // ----------------------------------------------------------
  draw() {
    const ctx = this.ctx;
    ctx.save();

    // 먼지 뭉게구름을 알갱이보다 먼저 그려서 알갱이가 먼지 위에 겹치게
    for (const d of this.dustPuffs) {
      const progress = d.ageMs / d.lifeMs;
      const alpha = Math.max(0, (1 - progress) * 0.35);
      ctx.beginPath();
      ctx.fillStyle = this.dustColor.replace('ALPHA', alpha.toFixed(3));
      ctx.ellipse(d.x, d.y, d.radius, d.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 모래 알갱이
    for (const p of this.particles) {
      const lifeRatio = 1 - p.ageMs / p.lifeMs;
      ctx.save();
      ctx.globalAlpha = Math.max(0, lifeRatio);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === 'round') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
      }
      ctx.restore();
    }

    // 전체 화면 플래시 (황금빛 — 유리는 흰색, 사막은 앰버)
    if (this.flash.alpha > 0) {
      ctx.globalAlpha = this.flash.alpha;
      ctx.fillStyle = '#e0b56e';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
    }

    // 피라미드 붕괴 배너 (4줄 전용) — 텍스트는 프로젝트 폰트/문구로 교체해서 써도 됨
    if (this.collapseBanner.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.collapseBanner.alpha;
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      ctx.translate(cx, cy);
      ctx.scale(this.collapseBanner.scale, this.collapseBanner.scale);
      ctx.fillStyle = '#f4dca0';
      ctx.strokeStyle = '#8a5a2b';
      ctx.lineWidth = 3;
      ctx.font = 'bold 36px sans-serif'; // ← 프로젝트 폰트로 교체 권장
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText('PYRAMID COLLAPSE', 0, 0);
      ctx.fillText('PYRAMID COLLAPSE', 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  clear() {
    this.particles.length = 0;
    this.dustPuffs.length = 0;
    this.shake.time = 0;
    this.flash.alpha = 0;
    this.hitStopMs = 0;
    this.collapseBanner.alpha = 0;
  }
}

class SandParticle {
  constructor(opts) {
    Object.assign(this, opts);
  }
}

class DustPuff {
  constructor(opts) {
    Object.assign(this, opts);
  }
}
if(typeof window!=='undefined')window.SandShatterFX=SandShatterFX;

// ============================================================
// GLASSFALL — glass-shatter-fx.js
// 유리 블록 라인 제거 시 파편/플래시/화면 흔들림 이펙트
// ============================================================
//
// 연결 방법 (engine.js / app.js 쪽에서 해야 할 일은 3줄):
//
//   import { GlassShatterFX } from './glass-shatter-fx.js';
//   const fx = new GlassShatterFX(canvas, { cellSize: 24 }); // cellSize는 실제 셀 픽셀 크기로
//
//   // 줄 완성 판정 직후, Field에서 셀을 지우기 "전에" 호출:
//   //   clearedCells: [{col, row}, ...]  (제거될 셀들의 격자 좌표)
//   //   lineCount:    이번에 동시 제거된 줄 수 (콤보/테트리스 강도 결정용)
//   fx.trigger(clearedCells, lineCount);
//
//   // 매 프레임 렌더링 루프 안에서 (게임 그리기 "이후"에) 호출:
//   fx.update(deltaMs);
//   fx.draw();
//
// 화면 흔들림을 게임 전체 캔버스에 적용하고 싶다면 fx.getShakeOffset()
// 값을 렌더링 루프 최상단에서 ctx.translate에 더해주면 된다.
// (아래 fx.draw()는 자기 캔버스 컨텍스트에 이미 흔들림을 반영해서 그림)
//
// 이 파일은 외부 의존성이 없고, 기존 게임 상태(Field, engine 등)를
// 전혀 건드리지 않는다. 실패해도 게임 로직에는 영향 없음.
// ============================================================

class GlassShatterFX {
  /**
   * @param {HTMLCanvasElement} canvas - 이펙트를 그릴 캔버스.
   *   별도 오버레이 캔버스를 새로 만들어 게임 캔버스 위에 겹쳐도 되고,
   *   기존 게임 캔버스를 그대로 넘겨서 같은 컨텍스트에 이어 그려도 된다.
   * @param {Object} opts
   * @param {number} opts.cellSize - 셀 한 칸의 화면 픽셀 크기 (기본 24)
   * @param {number} opts.originX - 게임판 좌측 시작 x좌표 (기본 0)
   * @param {number} opts.originY - 게임판 상단 시작 y좌표 (기본 0)
   * @param {number} opts.maxParticles - 동시 최대 파티클 수 (기본 220, 저사양 대비 캡)
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = opts.cellSize ?? 24;
    this.originX = opts.originX ?? 0;
    this.originY = opts.originY ?? 0;
    this.maxParticles = opts.maxParticles ?? 220;

    /** @type {Particle[]} */
    this.particles = [];

    // 화면 흔들림 상태
    this.shake = { time: 0, duration: 0, magnitude: 0 };

    // 플래시 상태 (전체 화이트 오버레이 알파)
    this.flash = { alpha: 0, decay: 0 };

    // 히트스탑(순간 정지) 상태 — 값이 남아있는 동안 update()가 호출자에게
    // "이번 프레임은 게임 로직을 멈춰라"라고 알려줄 수 있게 플래그만 제공.
    this.hitStopMs = 0;

    // 유리 파편 색상 팔레트 (약간의 청록/투명 유리 느낌)
    this.palette = [
      'rgba(210, 235, 245, 0.95)',
      'rgba(170, 210, 230, 0.9)',
      'rgba(140, 190, 220, 0.85)',
      'rgba(255, 255, 255, 0.9)',
      'rgba(120, 170, 200, 0.8)',
    ];
  }

  // ----------------------------------------------------------
  // 트리거: 줄이 완성되어 셀들이 사라지기 직전에 호출
  // clearedCells: [{col, row}] 격자 좌표 배열
  // lineCount: 동시에 지워진 줄 수 (1~4+)
  // ----------------------------------------------------------
  trigger(clearedCells, lineCount = 1) {
    if (!clearedCells || clearedCells.length === 0) return;

    const intensity = this._intensityFor(lineCount);

    for (const cell of clearedCells) {
      this._spawnFragmentsAt(cell.col, cell.row, intensity);
    }

    // 플래시: 줄 수가 많을수록 더 밝고 오래
    this.flash.alpha = Math.min(0.15 + lineCount * 0.12, 0.65);
    this.flash.decay = 0.0022; // ms당 감소량 (update에서 사용)

    // 화면 흔들림: 2줄 이상부터 적용, 테트리스(4줄)는 강하게
    if (lineCount >= 2) {
      this.shake.duration = 120 + lineCount * 40; // ms
      this.shake.time = this.shake.duration;
      this.shake.magnitude = 2 + lineCount * 1.6; // px
    }

    // 히트스탑: 3줄 이상일 때만 짧게. 호출자가 이 값을 보고
    // 그 시간만큼 게임 로직 업데이트를 건너뛰면 "쨍!" 하는 타격감이 생김.
    if (lineCount >= 3) {
      this.hitStopMs = lineCount >= 4 ? 90 : 50;
    }
  }

  /** 콤보 강도에 따른 파편 개수/속도 배율 계산 */
  _intensityFor(lineCount) {
    // 1줄: 기본, 4줄(테트리스): 약 2.2배
    const scale = 1 + Math.min(lineCount - 1, 3) * 0.4;
    return {
      countPerCell: Math.round(4 * scale),
      speedMul: scale,
    };
  }

  /** 셀 하나에서 파편 파티클 생성 */
  _spawnFragmentsAt(col, row, intensity) {
    const cx = this.originX + col * this.cellSize + this.cellSize / 2;
    const cy = this.originY + row * this.cellSize + this.cellSize / 2;

    for (let i = 0; i < intensity.countPerCell; i++) {
      if (this.particles.length >= this.maxParticles) {
        // 캡 초과 시 가장 오래된 파티클부터 제거해서 공간 확보
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const baseSpeed = (0.06 + Math.random() * 0.14) * intensity.speedMul; // px/ms
      // 파편은 삼각형이 자연스러움 (깨진 유리 조각 느낌)
      const size = this.cellSize * (0.12 + Math.random() * 0.22);

      this.particles.push(new Particle({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * baseSpeed,
        vy: Math.sin(angle) * baseSpeed - 0.05, // 살짝 위로 튀었다가 중력에 떨어짐
        size,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.012, // rad/ms
        color: this.palette[(Math.random() * this.palette.length) | 0],
        lifeMs: 420 + Math.random() * 360,
        ageMs: 0,
      }));
    }
  }

  // ----------------------------------------------------------
  // update: 매 프레임 호출. deltaMs = 지난 프레임과의 시간 간격(ms)
  // 반환값: 이번 프레임에 히트스탑이 활성 상태였는지 여부(boolean)
  // ----------------------------------------------------------
  update(deltaMs) {
    // 파편 물리
    const gravity = 0.00055; // px/ms^2
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.ageMs += deltaMs;
      if (p.ageMs >= p.lifeMs) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += gravity * deltaMs;
      p.x += p.vx * deltaMs;
      p.y += p.vy * deltaMs;
      p.rotation += p.rotationSpeed * deltaMs;
    }

    // 화면 흔들림 감쇠
    if (this.shake.time > 0) {
      this.shake.time = Math.max(0, this.shake.time - deltaMs);
    }

    // 플래시 감쇠
    if (this.flash.alpha > 0) {
      this.flash.alpha = Math.max(0, this.flash.alpha - this.flash.decay * deltaMs);
    }

    // 히트스탑 소비
    const stopping = this.hitStopMs > 0;
    if (stopping) {
      this.hitStopMs = Math.max(0, this.hitStopMs - deltaMs);
    }
    return stopping;
  }

  /** 현재 프레임의 화면 흔들림 오프셋 {x, y} 반환 (게임 전체 캔버스에 적용하고 싶을 때 사용) */
  getShakeOffset() {
    if (this.shake.time <= 0) return { x: 0, y: 0 };
    const progress = this.shake.time / this.shake.duration; // 1 → 0
    const mag = this.shake.magnitude * progress;
    return {
      x: (Math.random() * 2 - 1) * mag,
      y: (Math.random() * 2 - 1) * mag,
    };
  }

  // ----------------------------------------------------------
  // draw: 파편 + 플래시를 자기 컨텍스트에 그림
  // 게임 렌더링이 끝난 "다음"에 호출해야 파편이 블록 위에 겹쳐 보임
  // ----------------------------------------------------------
  draw() {
    const ctx = this.ctx;
    ctx.save();

    // 파편
    for (const p of this.particles) {
      const lifeRatio = 1 - p.ageMs / p.lifeMs; // 1 → 0
      ctx.save();
      ctx.globalAlpha = Math.max(0, lifeRatio);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      // 불규칙한 삼각형 파편 모양
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.85, p.size * 0.6);
      ctx.lineTo(-p.size * 0.7, p.size * 0.5);
      ctx.closePath();
      ctx.fill();
      // 살짝 하이라이트 선으로 유리 광택 느낌
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = Math.max(0.5, p.size * 0.06);
      ctx.stroke();
      ctx.restore();
    }

    // 전체 화면 플래시 (흰색 오버레이)
    if (this.flash.alpha > 0) {
      ctx.globalAlpha = this.flash.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /** 모든 이펙트 즉시 정리 (스테이지 전환 등에서 호출) */
  clear() {
    this.particles.length = 0;
    this.shake.time = 0;
    this.flash.alpha = 0;
    this.hitStopMs = 0;
  }
}

class Particle {
  constructor(opts) {
    Object.assign(this, opts);
  }
}

if (typeof window !== 'undefined') window.GlassShatterFX = GlassShatterFX;

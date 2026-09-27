/* Pure home presentation. Existing data-menu dispatcher owns mode/start/settings. */
(() => {
'use strict';
const blockIcon='<svg viewBox="0 0 36 30" aria-hidden="true"><path d="M3 14l12 1 1-12 12 1-1 12 7 1-1 11-31-2z" fill="#ed9cbb" stroke="#866478" stroke-width="1.8"/><path d="M7 18l4 1m8-11 5 1m-6 10 5 1m5 3 3 1" stroke="#fff5e4" stroke-width="2.3"/></svg>';
const sandIcon='<svg viewBox="0 0 36 30" aria-hidden="true"><path d="M2 25Q8 16 13 12Q16 4 21 12Q25 19 34 26z" fill="#ecc777" stroke="#927a55" stroke-width="1.8"/><path d="M9 23l3-2m4-5 3 1m2 5 4 1m-9 1 2 1" stroke="#fff6d9" stroke-width="2"/></svg>';
window.CrayonHome={render({kind,best}){
 const normal=kind==='normal';
 return `<section class="cb-home" aria-label="크레용블룸 시작 화면">
  <div class="cb-paper-edge" aria-hidden="true"></div>
  <header class="cb-heading"><p class="cb-eyebrow">CRAYON BLOOM</p><h1><img class="cb-logo" src="assets/bloom-home-logo.webp" width="900" height="320" alt="크레용블룸" fetchpriority="high"></h1><p class="cb-tagline">작은 블록이 피워내는 색색의 즐거움</p></header>
  <figure class="cb-scene"><img class="cb-hero" src="assets/bloom-home-hero.webp" width="1000" height="750" alt="풍성한 검은 곱슬머리와 분홍 후드티의 공식 아기가 크레용과 노란 병아리를 안고 있어요" fetchpriority="high" decoding="async"><figcaption>오늘도, 우리 같이 색칠할까?</figcaption></figure>
  <div class="cb-play"><div class="cb-mode-tabs" role="group" aria-label="게임 모드 선택">
   <button class="cb-mode ${normal?'is-selected':''}" data-menu="normal" aria-pressed="${normal}" aria-label="일반 모드"><span class="cb-mode-icon">${blockIcon}</span><span>일반 모드</span><span class="cb-check" aria-hidden="true">${normal?'✓':'○'}</span></button>
   <button class="cb-mode ${!normal?'is-selected':''}" data-menu="sand" aria-pressed="${!normal}" aria-label="모래 모드"><span class="cb-mode-icon">${sandIcon}</span><span>모래 모드</span><span class="cb-check" aria-hidden="true">${!normal?'✓':'○'}</span></button>
  </div><p class="cb-mode-hint" aria-live="polite">${normal?'차곡차곡 쌓고, 가로줄을 활짝!':'사르르 모으고, 색색의 모래를 와르르!'}</p>
  <button class="cb-start" data-menu="start" aria-label="${normal?'일반':'모래'} 모드 시작하기"><span>시작하기</span><svg viewBox="0 0 36 28" aria-hidden="true"><path d="M4 14q12-2 25 0M21 5l9 9-10 9"/></svg></button>
  <div class="cb-bottom"><p class="cb-best">${normal?'일반':'모래'} 최고점 <strong>${Number(best||0).toLocaleString()}<small>점</small></strong></p><button class="cb-settings" data-menu="settings" aria-label="놀이 방법 및 설정"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2.5"/><circle cx="16" cy="12" r="2.5"/><circle cx="10" cy="18" r="2.5"/></svg>놀이 방법 · 설정</button></div></div>
  <footer class="cb-colophon"><span>CRAYON BLOOM</span><small>MAIN 7 · CONTROL 18 · HOME 1</small></footer>
 </section>`;
}};
})();

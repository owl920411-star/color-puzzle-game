/* Pure home presentation. Existing data-menu dispatcher owns mode/start/settings. */
(() => {
'use strict';
let homeSeen=false;
const blockIcon='<svg viewBox="0 0 36 30" aria-hidden="true"><path d="M3 14l12 1 1-12 12 1-1 12 7 1-1 11-31-2z" fill="#ed9cbb" stroke="#866478" stroke-width="1.8"/><path d="M7 18l4 1m8-11 5 1m-6 10 5 1m5 3 3 1" stroke="#fff5e4" stroke-width="2.3"/></svg>';
window.CrayonHome={render({kind,best}){
 const intro=homeSeen?'return':'first';homeSeen=true;
 return `<section class="cb-home" data-home-intro="${intro}" aria-label="크레용블룸 시작 화면">
  <div class="cb-paper-edge" aria-hidden="true"></div>
  <header class="cb-heading"><p class="cb-eyebrow">CRAYON BLOOM</p><h1><img class="cb-logo" src="assets/bloom-home-logo.webp" width="900" height="320" alt="크레용블룸" fetchpriority="high"></h1><p class="cb-tagline">작은 블록이 피워내는 색색의 즐거움</p></header>
  <figure class="cb-scene"><img class="cb-hero" src="assets/bloom-home-hero.webp" width="1000" height="750" alt="풍성한 검은 곱슬머리와 분홍 후드티의 공식 아기가 크레용과 노란 병아리를 안고 있어요" fetchpriority="high" decoding="async"><figcaption>오늘도, 우리 같이 색칠할까?</figcaption></figure>
  <div class="cb-play"><p class="cb-mode-hint" aria-live="polite">차곡차곡 쌓고, 가로줄을 활짝!</p>
  <button class="cb-start" data-menu="start" aria-label="게임 시작하기"><span>시작하기</span><svg viewBox="0 0 36 28" aria-hidden="true"><path d="M4 14q12-2 25 0M21 5l9 9-10 9"/></svg></button>
  <div class="cb-bottom"><p class="cb-best">최고점 <strong>${Number(best||0).toLocaleString()}<small>점</small></strong></p><button class="cb-settings" data-menu="settings" aria-label="놀이 방법 및 설정"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2.5"/><circle cx="16" cy="12" r="2.5"/><circle cx="10" cy="18" r="2.5"/></svg>놀이 방법 · 설정</button></div></div>
  <footer class="cb-colophon"><span>CRAYON BLOOM</span><small>RC 검수 3 · CONTROL 23 · HOME RC</small></footer>
 </section>`;
}};
})();

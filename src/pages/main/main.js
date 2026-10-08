import { escapeHtml } from '../../utils/html.js';
export function mainPage(member) {
  return `<section class="hero container">
    <div class="hero-copy"><p class="eyebrow">오늘부터, 조금 더 정확하게</p><h1>이건 어디에<br>버려야 할까요<span>?</span></h1><p class="lead">물건의 재질과 상태에 맞는 분리배출 방법.<br>헷갈리는 순간, 분리배출 도우미와 함께해요.</p>
    <a class="button primary" href="#/item-input">분리배출 알아보기 <span aria-hidden="true">↗</span></a><p class="caption">물건의 재질과 상태를 차근차근 입력해 보세요.</p></div>
    <div class="hero-art" role="img" aria-label="종이, 플라스틱, 캔을 나누어 담은 세 개의 분리수거함"><span class="art-label">작은 실천, 새로운 쓰임</span><div class="orbit" aria-hidden="true">↻</div><div class="bins" aria-hidden="true"><div class="bin paper"><span>▤</span><strong>종이</strong><small>PAPER</small></div><div class="bin plastic"><span>♧</span><strong>플라스틱</strong><small>PLASTIC</small></div><div class="bin can"><span>▥</span><strong>캔</strong><small>METAL</small></div></div><span class="art-bottom">다시 쓰일 수 있도록, 올바르게 나눠요.</span></div>
  </section>
  <section class="steps-section"><div class="container"><div class="section-title"><p class="eyebrow">HOW IT WORKS</p><h2>분리배출, 세 단계면 충분해요</h2><p>복잡한 기준 대신, 내 물건에 필요한 안내를 만나보세요.</p></div><div class="steps">
    <article class="step"><span class="step-number">01</span><h3>어떤 물건인가요?</h3><p>버리려는 물건의 이름과<br>주요 재질을 알려주세요.</p></article>
    <article class="step"><span class="step-number">02</span><h3>상태를 확인해요</h3><p>오염과 세척 여부, 다른 재질과<br>분리할 수 있는지 확인해요.</p></article>
    <article class="step"><span class="step-number">03</span><h3>방법을 알아봐요</h3><p>배출 방법부터 필요한 처리 과정,<br>판단 이유까지 안내해요.</p></article>
  </div></div></section>
  <section class="container account-banner"><div><p class="eyebrow">MY RECYCLING</p><h2>${member ? escapeHtml(member.nickname) + '님, 반가워요!' : '나의 분리배출을 차곡차곡'}</h2><p>판별한 물품을 다시 살펴보고, 유형별 통계를 확인해 보세요.</p></div><a class="button secondary" href="#/history">기록 및 통계 보기 <span aria-hidden="true">→</span></a></section>`;
}


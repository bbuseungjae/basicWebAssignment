// Quotes
const quotes = [
  'When you have eliminated the impossible, whatever remains, however improbable, must be the truth.',
  'There is nothing more deceptive than an obvious fact.',
  'I ought to know by this time that when a fact appears to be opposed to a long train of deductions it invariably proves to be capable of bearing some other interpretation.',
  'I never make exceptions. An exception disproves the rule.',
  'What one man can invent another can discover.',
  'Nothing clears up a case so much as stating it to another person.',
  'Education never ends, Watson. It is a series of lessons, with the greatest for the last.',
];

// Elements
const quoteElement   = document.getElementById('quote');
const messageElement = document.getElementById('message');
const typedValueEl   = document.getElementById('typed-value');
const startBtn       = document.getElementById('start');
const bestEl         = document.getElementById('best');

// Modal elements
const overlayEl      = document.getElementById('result-overlay');
const resultSecEl    = document.getElementById('result-seconds');
const resultBestEl   = document.getElementById('result-best');
const playAgainBtn   = document.getElementById('play-again');
const closeModalBtn  = document.getElementById('close-modal');

// State
let words = [];
let wordIndex = 0;
let startTime = 0;
let inputHandlerActive = false;

const LS_KEY = 'typingGame.bestSeconds';

// Utils
const formatSeconds = ms => (ms / 1000).toFixed(2);
const getBest = () => {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? Number(raw) : null;
};
const setBest = seconds => {
  localStorage.setItem(LS_KEY, String(seconds));
  bestEl.textContent = seconds.toFixed(2) + ' s';
};

// Initial best load - localStorage를 사용하여 최고 점수 저장
(() => {
  const best = getBest();
  if (best != null) bestEl.textContent = best.toFixed(2) + ' s';
})();

// Game start
function startGame() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  words = quote.split(' ');
  wordIndex = 0;

  // Render words
  quoteElement.innerHTML = words.map(w => `<span>${w} </span>`).join('');
  if (quoteElement.children.length > 0) {
    quoteElement.children[0].className = 'highlight';
  }

  // Reset UI
  messageElement.textContent = '';
  typedValueEl.value = '';
  typedValueEl.className = '';
  typedValueEl.disabled = false;
  startBtn.disabled = true;              // 진행 중 버튼 비활성화
  typedValueEl.focus();

  // Activate input handler
  if (!inputHandlerActive) {
    typedValueEl.addEventListener('input', handleInput);
    inputHandlerActive = true;
  }

  startTime = Date.now();
}

// Input handler - input 이벤트 입력 시 CSS를 추가하여 여러가지 효과 적용해보기
function handleInput() {
  // 입력 효과
  typedValueEl.classList.add('typing');
  requestAnimationFrame(() => {
    // 효과 클래스 빠르게 제거하여 재적용 가능
    setTimeout(() => typedValueEl.classList.remove('typing'), 150);
  });

  const currentWord = words[wordIndex];
  const typedValue = typedValueEl.value;

  // 완료 체크(마지막 단어까지 정확)
  if (typedValue === currentWord && wordIndex === words.length - 1) {
    finishGame();
    return;
  }

  // 단어 완료 + 공백 → 다음 단어
  if (typedValue.endsWith(' ') && typedValue.trim() === currentWord) {
    typedValueEl.value = '';
    wordIndex++;

    // 하이라이트 갱신
    for (const el of quoteElement.children) el.className = '';
    if (wordIndex < quoteElement.children.length) {
      quoteElement.children[wordIndex].className = 'highlight';
    }
    typedValueEl.classList.remove('error');
    return;
  }

  // 진행 중 판정
  if (currentWord && currentWord.startsWith(typedValue)) {
    typedValueEl.classList.remove('error');
  } else {
    typedValueEl.classList.add('error');
  }
}

// Finish & modal
function finishGame() {
  const elapsedMs = Date.now() - startTime;
  const seconds = Number(formatSeconds(elapsedMs));

  // 상태/하이라이트 정리
  for (const el of quoteElement.children) el.className = '';
  typedValueEl.classList.remove('error');
  typedValueEl.disabled = true;  // 게임이 완료되면 텍스트 상자를 비활성화

  // 입력 리스너 비활성화 - 완료 시 이벤트 리스너를 비활성화
  if (inputHandlerActive) {
    typedValueEl.removeEventListener('input', handleInput);
    inputHandlerActive = false;
  }

  // 버튼 재활성화(재시작 가능) - input 및 button 클릭 시 다시 활성화
  startBtn.disabled = false;

  // 메시지
  messageElement.textContent = `CONGRATULATIONS! You finished in ${seconds.toFixed(2)} seconds.`;

  // 최고 기록 갱신
  const best = getBest();
  if (best == null || seconds < best) {
    setBest(seconds);
  }

  // 모달 표시 - 결과를 더 돋보이게 할 모달창을 표시
  showResultModal(seconds, getBest() ?? seconds);

  // 입력창 클릭 시 재시작 가능
  typedValueEl.addEventListener('click', startGame, { once: true });
}

// Modal helpers
function showResultModal(seconds, bestSeconds) {
  resultSecEl.textContent = seconds.toFixed(2);
  resultBestEl.textContent = bestSeconds.toFixed(2);
  overlayEl.classList.remove('hidden');
  overlayEl.setAttribute('aria-hidden', 'false');
}

function hideResultModal() {
  overlayEl.classList.add('hidden');
  overlayEl.setAttribute('aria-hidden', 'true');
}

// Events
startBtn.addEventListener('click', () => {
  hideResultModal();
  startGame();
});

playAgainBtn.addEventListener('click', () => {
  hideResultModal();
  startGame();
});

closeModalBtn.addEventListener('click', hideResultModal);

// ESC로 모달 닫기
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !overlayEl.classList.contains('hidden')) {
    hideResultModal();
  }
});
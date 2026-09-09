/**
 * 多益 750–900 智能背單字卡系統
 * 核心功能：單字池分級、每日 10 字動態抽題演算法、即時學習統計與收藏生詞本
 */

// 常數與儲存鍵值
const STORAGE_KEYS = {
  DATA_VERSION: 'toeic_vocab_data_version',
  WORD_STATES: 'toeic_word_states_v2',
  DAILY_SESSION: 'toeic_daily_session_v2'
};

const CURRENT_VOCAB_VERSION = 'toeic_800_gold_v2';

const POOL_TYPES = {
  UNLEARNED: 'unlearned',
  HARD: 'hard',
  REVIEW: 'review',
  MASTERED: 'mastered'
};

// 全域狀態
let allWords = [];               // 200 個多益單字
let wordStates = {};             // { [id]: { status: 'unlearned'|'hard'|'review'|'mastered', starred: bool } }
let todaySession = null;         // { date: 'YYYY-MM-DD', wordIds: [], currentIndex: 0, completedRatings: {} }
let todayWords = [];             // 當日 10 個單字物件陣列
let currentIndex = 0;
let isFlipped = false;

// DOM 元素快取
const dom = {
  // 頁籤導航
  tabBtns: document.querySelectorAll('.nav-pill'),
  viewPanels: document.querySelectorAll('.view-panel'),
  
  // 測驗視圖
  flashcard: document.getElementById('flashcard'),
  sessionDateBadge: document.getElementById('session-date-badge'),
  cardCounter: document.getElementById('card-counter'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  completionCard: document.getElementById('completion-card'),

  // 卡片正面
  frontPoolBadge: document.getElementById('front-pool-badge'),
  frontStarBtn: document.getElementById('front-star-btn'),
  pronounceBtn: document.getElementById('pronounce-btn'),
  frontWord: document.getElementById('front-word'),
  frontPhonetic: document.getElementById('front-phonetic'),
  frontPos: document.getElementById('front-pos'),

  // 卡片背面
  backPoolBadge: document.getElementById('back-pool-badge'),
  backStarBtn: document.getElementById('back-star-btn'),
  backPronounceBtn: document.getElementById('back-pronounce-btn'),
  backTranslation: document.getElementById('back-translation'),
  backExampleEn: document.getElementById('back-example-en'),
  backExampleZh: document.getElementById('back-example-zh'),

  // Action Dock 與評級控制列
  dockFront: document.getElementById('dock-front'),
  dockBack: document.getElementById('dock-back'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  flipBtn: document.getElementById('flip-btn'),
  dockBackPrevBtn: document.getElementById('dock-back-prev-btn'),
  dockBackNextBtn: document.getElementById('dock-back-next-btn'),

  // 評級按鈕
  gradeHardBtn: document.getElementById('grade-hard-btn'),
  gradeReviewBtn: document.getElementById('grade-review-btn'),
  gradeMasteredBtn: document.getElementById('grade-mastered-btn'),

  // 完成畫面按鈕與摘要
  sumHardCount: document.getElementById('sum-hard-count'),
  sumReviewCount: document.getElementById('sum-review-count'),
  sumMasteredCount: document.getElementById('sum-mastered-count'),
  btnDrawNext10: document.getElementById('btn-draw-next-10'),
  btnReviewTodayAgain: document.getElementById('btn-review-today-again'),
  btnGotoStats: document.getElementById('btn-goto-stats'),

  // 統計頁面元素
  countUnlearned: document.getElementById('count-unlearned'),
  countHard: document.getElementById('count-hard'),
  countReview: document.getElementById('count-review'),
  countMastered: document.getElementById('count-mastered'),
  barUnlearned: document.getElementById('bar-unlearned'),
  barHard: document.getElementById('bar-hard'),
  barReview: document.getElementById('bar-review'),
  barMastered: document.getElementById('bar-mastered'),
  masteryPercentText: document.getElementById('mastery-percent-text'),
  barSegMastered: document.getElementById('bar-seg-mastered'),
  barSegReview: document.getElementById('bar-seg-review'),
  barSegHard: document.getElementById('bar-seg-hard'),
  barSegUnlearned: document.getElementById('bar-seg-unlearned'),
  btnForceReroll: document.getElementById('btn-force-reroll'),
  btnResetData: document.getElementById('btn-reset-data'),

  // 收藏清單
  starredCountLabel: document.getElementById('starred-count-label'),
  starredList: document.getElementById('starred-list')
};

// ==========================================
// 1. 本地儲存與狀態管理 (localStorage)
// ==========================================

function loadStoredStates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORD_STATES);
    wordStates = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to parse wordStates from localStorage:', e);
    wordStates = {};
  }
}

function saveStoredStates() {
  try {
    localStorage.setItem(STORAGE_KEYS.WORD_STATES, JSON.stringify(wordStates));
  } catch (e) {
    console.error('Failed to save wordStates to localStorage:', e);
  }
}

function getWordState(wordId) {
  if (!wordStates[wordId]) {
    wordStates[wordId] = {
      status: POOL_TYPES.UNLEARNED,
      starred: false,
      lastReviewed: null,
      reviewCount: 0
    };
  }
  return wordStates[wordId];
}

function setWordStatus(wordId, newStatus) {
  const item = getWordState(wordId);
  item.status = newStatus;
  item.lastReviewed = Date.now();
  item.reviewCount = (item.reviewCount || 0) + 1;
  saveStoredStates();
  updateStatsDisplay();
}

function toggleWordStar(wordId) {
  const item = getWordState(wordId);
  item.starred = !item.starred;
  saveStoredStates();
  renderStarButtons(item.starred);
  renderStarredList();
}

// ==========================================
// 2. 每日 10 字動態抽題演算法
// ==========================================

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function scheduleDaily10Words(wordsList, statesMap) {
  const hardPool = [];
  const reviewPool = [];
  const unlearnedPool = [];

  wordsList.forEach((word) => {
    const state = statesMap[word.id]?.status || POOL_TYPES.UNLEARNED;
    if (state === POOL_TYPES.HARD) {
      hardPool.push(word);
    } else if (state === POOL_TYPES.REVIEW) {
      reviewPool.push(word);
    } else if (state === POOL_TYPES.UNLEARNED) {
      unlearnedPool.push(word);
    }
    // mastered 永久排除
  });

  const shuffledHard = shuffleArray(hardPool);
  const shuffledReview = shuffleArray(reviewPool);
  const shuffledUnlearned = shuffleArray(unlearnedPool);

  const selected = [];

  // 1. 優先選取最多 4 個 hard
  const pickHard = shuffledHard.slice(0, 4);
  selected.push(...pickHard);

  // 2. 次優先選取最多 3 個 review
  const pickReview = shuffledReview.slice(0, 3);
  selected.push(...pickReview);

  // 3. 計算需補足名額以湊滿 10 字
  const needSlots = 10 - selected.length;

  // 4. 從 unlearned 池補足
  const pickUnlearned = shuffledUnlearned.slice(0, needSlots);
  selected.push(...pickUnlearned);

  // 5. 若仍不足 10 字，自 hard 與 review 剩餘字數再次補齊
  if (selected.length < 10) {
    const leftoverReview = shuffledReview.slice(3);
    const leftoverHard = shuffledHard.slice(4);
    const extraPool = [...leftoverHard, ...leftoverReview];
    const stillNeeded = 10 - selected.length;
    selected.push(...extraPool.slice(0, stillNeeded));
  }

  return shuffleArray(selected);
}

function initDailySession(forceNew = false) {
  const todayStr = getTodayDateString();
  let storedSession = null;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_SESSION);
    if (raw) storedSession = JSON.parse(raw);
  } catch (e) {
    storedSession = null;
  }

  if (!forceNew && storedSession && storedSession.date === todayStr && Array.isArray(storedSession.wordIds) && storedSession.wordIds.length > 0) {
    todaySession = storedSession;
    todayWords = todaySession.wordIds
      .map((id) => allWords.find((w) => w.id === id))
      .filter(Boolean);
  } else {
    const scheduled = scheduleDaily10Words(allWords, wordStates);
    todayWords = scheduled;
    todaySession = {
      date: todayStr,
      wordIds: todayWords.map((w) => w.id),
      currentIndex: 0,
      completedRatings: {}
    };
    saveDailySession();
  }

  dom.sessionDateBadge.textContent = `${todaySession.date} 任務`;
  currentIndex = todaySession.currentIndex || 0;
  if (currentIndex >= todayWords.length && todayWords.length > 0) {
    currentIndex = todayWords.length - 1;
  }
}

function saveDailySession() {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_SESSION, JSON.stringify(todaySession));
  } catch (e) {
    console.error('Failed to save dailySession to localStorage:', e);
  }
}

// ==========================================
// 3. 單字卡渲染與互動控制
// ==========================================

function getPoolLabelInfo(status) {
  switch (status) {
    case POOL_TYPES.HARD:
      return { text: '需要加強 (不熟)', className: 'pool-hard' };
    case POOL_TYPES.REVIEW:
      return { text: '定期複習', className: 'pool-review' };
    case POOL_TYPES.MASTERED:
      return { text: '已掌握 (畢業)', className: 'pool-mastered' };
    case POOL_TYPES.UNLEARNED:
    default:
      return { text: '全新單字', className: 'pool-unlearned' };
  }
}

function renderStarButtons(isStarred) {
  const symbol = isStarred ? '⭐' : '☆';
  if (dom.frontStarBtn) {
    dom.frontStarBtn.textContent = symbol;
    dom.frontStarBtn.classList.toggle('active', isStarred);
  }
  if (dom.backStarBtn) {
    dom.backStarBtn.textContent = symbol;
    dom.backStarBtn.classList.toggle('active', isStarred);
  }
}

function updateActionDock(flipped) {
  if (!dom.dockFront || !dom.dockBack) return;
  if (flipped) {
    dom.dockFront.classList.add('hidden');
    dom.dockBack.classList.remove('hidden');
  } else {
    dom.dockFront.classList.remove('hidden');
    dom.dockBack.classList.add('hidden');
  }
}

function renderCard(index) {
  if (!todayWords || todayWords.length === 0) return;
  
  // 檢查是否已完成本日 10 題
  const ratedCount = Object.keys(todaySession.completedRatings || {}).length;
  if (ratedCount >= todayWords.length && index >= todayWords.length) {
    showCompletionCard();
    return;
  }

  dom.completionCard.classList.add('hidden');
  dom.flashcard.style.display = 'block';

  const data = todayWords[index];
  const state = getWordState(data.id);
  const poolInfo = getPoolLabelInfo(state.status);

  // 正面內容
  dom.frontPoolBadge.textContent = poolInfo.text;
  dom.frontPoolBadge.className = `pool-badge ${poolInfo.className}`;
  dom.frontWord.textContent = data.word;
  dom.frontPhonetic.textContent = data.phonetic || '';
  dom.frontPos.textContent = data.partOfSpeech || '';

  // 背面內容
  dom.backPoolBadge.textContent = poolInfo.text;
  dom.backPoolBadge.className = `pool-badge ${poolInfo.className}`;
  dom.backTranslation.textContent = data.meaning;
  dom.backExampleEn.textContent = typeof data.example === 'object' ? data.example.en : data.example;
  dom.backExampleZh.textContent = data.exampleZh || (typeof data.example === 'object' ? data.example.zh : '');

  // 收藏狀態
  renderStarButtons(state.starred);

  // 進度指示器
  const currentNum = index + 1;
  const totalNum = todayWords.length;
  dom.cardCounter.textContent = `${currentNum} / ${totalNum}`;
  dom.progressBarFill.style.width = `${(currentNum / totalNum) * 100}%`;

  // 上下題按鈕狀態
  const isFirst = index === 0;
  const isLast = index === todayWords.length - 1;
  dom.prevBtn.disabled = isFirst;
  dom.nextBtn.disabled = isLast;
  if (dom.dockBackPrevBtn) dom.dockBackPrevBtn.disabled = isFirst;
  if (dom.dockBackNextBtn) dom.dockBackNextBtn.disabled = isLast;

  flipToFront();

  todaySession.currentIndex = index;
  saveDailySession();
}

function flipCard() {
  isFlipped = !isFlipped;
  if (isFlipped) {
    dom.flashcard.classList.add('is-flipped');
  } else {
    dom.flashcard.classList.remove('is-flipped');
  }
  updateActionDock(isFlipped);
}

function flipToFront() {
  isFlipped = false;
  dom.flashcard.classList.remove('is-flipped');
  updateActionDock(false);
}

function nextCard() {
  if (currentIndex < todayWords.length - 1) {
    flipToFront();
    setTimeout(() => {
      currentIndex++;
      renderCard(currentIndex);
    }, 150);
  } else {
    const ratedCount = Object.keys(todaySession.completedRatings || {}).length;
    if (ratedCount >= todayWords.length) {
      showCompletionCard();
    }
  }
}

function prevCard() {
  if (currentIndex > 0) {
    flipToFront();
    setTimeout(() => {
      currentIndex--;
      renderCard(currentIndex);
    }, 150);
  }
}

function handleGradeWord(status) {
  if (!todayWords || todayWords.length === 0) return;
  const currentWord = todayWords[currentIndex];

  setWordStatus(currentWord.id, status);

  if (!todaySession.completedRatings) todaySession.completedRatings = {};
  todaySession.completedRatings[currentWord.id] = status;
  saveDailySession();

  if (currentIndex < todayWords.length - 1) {
    flipToFront();
    setTimeout(() => {
      currentIndex++;
      renderCard(currentIndex);
    }, 150);
  } else {
    flipToFront();
    setTimeout(() => {
      showCompletionCard();
    }, 180);
  }
}

function showCompletionCard() {
  dom.flashcard.style.display = 'none';
  dom.completionCard.classList.remove('hidden');

  let hardC = 0, reviewC = 0, masteredC = 0;
  const ratings = todaySession.completedRatings || {};
  Object.values(ratings).forEach((val) => {
    if (val === POOL_TYPES.HARD) hardC++;
    else if (val === POOL_TYPES.REVIEW) reviewC++;
    else if (val === POOL_TYPES.MASTERED) masteredC++;
  });

  dom.sumHardCount.textContent = hardC;
  dom.sumReviewCount.textContent = reviewC;
  dom.sumMasteredCount.textContent = masteredC;
  dom.progressBarFill.style.width = '100%';
  dom.cardCounter.textContent = `${todayWords.length} / ${todayWords.length} 完成`;
}

function speakWord(word) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

// ==========================================
// 4. 學習統計計算與圖表渲染
// ==========================================

function updateStatsDisplay() {
  if (!allWords || allWords.length === 0) return;
  const total = allWords.length;

  let unlearned = 0, hard = 0, review = 0, mastered = 0;

  allWords.forEach((w) => {
    const s = wordStates[w.id]?.status || POOL_TYPES.UNLEARNED;
    if (s === POOL_TYPES.HARD) hard++;
    else if (s === POOL_TYPES.REVIEW) review++;
    else if (s === POOL_TYPES.MASTERED) mastered++;
    else unlearned++;
  });

  dom.countUnlearned.textContent = unlearned;
  dom.countHard.textContent = hard;
  dom.countReview.textContent = review;
  dom.countMastered.textContent = mastered;

  dom.barUnlearned.style.width = `${(unlearned / total) * 100}%`;
  dom.barHard.style.width = `${(hard / total) * 100}%`;
  dom.barReview.style.width = `${(review / total) * 100}%`;
  dom.barMastered.style.width = `${(mastered / total) * 100}%`;

  dom.barSegMastered.style.width = `${(mastered / total) * 100}%`;
  dom.barSegReview.style.width = `${(review / total) * 100}%`;
  dom.barSegHard.style.width = `${(hard / total) * 100}%`;
  dom.barSegUnlearned.style.width = `${(unlearned / total) * 100}%`;

  const masteryPercent = Math.round((mastered / total) * 100);
  dom.masteryPercentText.textContent = `${masteryPercent}% (${mastered}/${total})`;
}

// ==========================================
// 5. 收藏生詞本渲染
// ==========================================

function renderStarredList() {
  const starredWords = allWords.filter((w) => wordStates[w.id]?.starred);
  dom.starredCountLabel.textContent = `已收藏 ${starredWords.length} 個單字`;

  if (starredWords.length === 0) {
    dom.starredList.innerHTML = `
      <div style="text-align: center; color: var(--slate-400); padding: 36px 0;">
        <p style="font-size: 0.88rem;">尚未收藏任何單字。在單字卡右上角點擊 ☆ 即可隨時加入生詞本。</p>
      </div>
    `;
    return;
  }

  dom.starredList.innerHTML = starredWords
    .map((w) => {
      const state = getWordState(w.id);
      const poolInfo = getPoolLabelInfo(state.status);
      return `
        <div class="starred-item-card">
          <div>
            <div class="starred-item-word">
              ${w.word}
              <span class="pool-badge ${poolInfo.className}" style="font-size: 0.7rem; padding: 2px 8px;">
                ${poolInfo.text}
              </span>
            </div>
            <div class="starred-item-phonetic">${w.phonetic || ''} · ${w.partOfSpeech || ''}</div>
            <div class="starred-item-meaning">${w.meaning}</div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="ghost-icon-btn" onclick="speakWord('${w.word}')" title="朗讀">🔊</button>
            <button class="ghost-icon-btn star-btn active" onclick="toggleWordStar(${w.id})" title="取消收藏">⭐</button>
          </div>
        </div>
      `;
    })
    .join('');
}

// ==========================================
// 6. 事件監聽綁定
// ==========================================

function bindEvents() {
  dom.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      dom.tabBtns.forEach((b) => b.classList.remove('active'));
      dom.viewPanels.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${targetTab}-view`).classList.add('active');

      if (targetTab === 'stats') {
        updateStatsDisplay();
      } else if (targetTab === 'starred') {
        renderStarredList();
      }
    });
  });

  dom.flashcard.addEventListener('click', (e) => {
    if (e.target.closest('.ghost-icon-btn')) return;
    flipCard();
  });

  dom.flipBtn.addEventListener('click', flipCard);
  dom.nextBtn.addEventListener('click', nextCard);
  dom.prevBtn.addEventListener('click', prevCard);

  if (dom.dockBackNextBtn) dom.dockBackNextBtn.addEventListener('click', nextCard);
  if (dom.dockBackPrevBtn) dom.dockBackPrevBtn.addEventListener('click', prevCard);

  dom.gradeHardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleGradeWord(POOL_TYPES.HARD);
  });

  dom.gradeReviewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleGradeWord(POOL_TYPES.REVIEW);
  });

  dom.gradeMasteredBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleGradeWord(POOL_TYPES.MASTERED);
  });

  dom.frontStarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (todayWords[currentIndex]) toggleWordStar(todayWords[currentIndex].id);
  });
  dom.backStarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (todayWords[currentIndex]) toggleWordStar(todayWords[currentIndex].id);
  });

  dom.pronounceBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (todayWords[currentIndex]) speakWord(todayWords[currentIndex].word);
  });
  dom.backPronounceBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (todayWords[currentIndex]) speakWord(todayWords[currentIndex].word);
  });

  dom.btnDrawNext10.addEventListener('click', () => {
    initDailySession(true);
    currentIndex = 0;
    renderCard(currentIndex);
  });

  dom.btnReviewTodayAgain.addEventListener('click', () => {
    currentIndex = 0;
    todaySession.completedRatings = {};
    saveDailySession();
    renderCard(currentIndex);
  });

  dom.btnGotoStats.addEventListener('click', () => {
    document.getElementById('tab-stats-btn').click();
  });

  dom.btnForceReroll.addEventListener('click', () => {
    if (confirm('確定要提前重新抽取今日 10 個單字嗎？')) {
      initDailySession(true);
      document.getElementById('tab-quiz-btn').click();
      renderCard(currentIndex);
    }
  });

  dom.btnResetData.addEventListener('click', () => {
    if (confirm('警告：確定要清除所有學習紀錄與單字池分級嗎？此操作無法復原。')) {
      localStorage.removeItem(STORAGE_KEYS.WORD_STATES);
      localStorage.removeItem(STORAGE_KEYS.DAILY_SESSION);
      wordStates = {};
      initDailySession(true);
      updateStatsDisplay();
      renderStarredList();
      renderCard(0);
      alert('學習紀錄已重置');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      flipCard();
    } else if (e.code === 'ArrowRight') {
      nextCard();
    } else if (e.code === 'ArrowLeft') {
      prevCard();
    } else if (e.key === '1') {
      handleGradeWord(POOL_TYPES.HARD);
    } else if (e.key === '2') {
      handleGradeWord(POOL_TYPES.REVIEW);
    } else if (e.key === '3') {
      handleGradeWord(POOL_TYPES.MASTERED);
    }
  });
}

// ==========================================
// 7. 系統啟動進入點
// ==========================================

// 檢查並執行詞庫升級遷移（自動重置抽題）
function checkVocabVersionMigration() {
  try {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
    if (storedVersion !== CURRENT_VOCAB_VERSION) {
      console.log('🔄 偵測到全新 TOEIC 800–900 金色證書高頻詞庫，自動重置今日抽題與快取狀態...');
      localStorage.removeItem(STORAGE_KEYS.DAILY_SESSION);
      localStorage.removeItem('toeic_daily_session_v1');
      localStorage.removeItem('toeic_word_states_v1');
      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_VOCAB_VERSION);
      return true;
    }
  } catch (e) {
    console.warn('Migration check failed:', e);
  }
  return false;
}

function bootstrapApp(loadedWords) {
  allWords = loadedWords;
  const isMigrated = checkVocabVersionMigration();
  loadStoredStates();
  initDailySession(isMigrated); // 若剛升級詞庫，強制新抽今日 10 字
  renderCard(currentIndex);
  updateStatsDisplay();
  renderStarredList();
  bindEvents();
}

if (window.TOEIC_WORDS && Array.isArray(window.TOEIC_WORDS) && window.TOEIC_WORDS.length > 0) {
  bootstrapApp(window.TOEIC_WORDS);
} else {
  fetch('words.json')
    .then((res) => res.json())
    .then((data) => {
      bootstrapApp(data);
    })
    .catch((err) => {
      console.warn('Could not fetch words.json, using fallback:', err);
    });
}

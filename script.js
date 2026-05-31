// ========== WORD LIST ==========
const wordList = [
  "the", "be", "of", "and", "a", "to", "in", "he", "have", "it",
  "that", "for", "they", "I", "with", "as", "not", "on", "she", "at",
  "by", "this", "we", "you", "do", "but", "from", "or", "which", "one",
  "would", "all", "will", "there", "say", "who", "make", "when", "can", "more",
  "if", "no", "man", "out", "other", "so", "what", "time", "up", "go",
  "about", "than", "into", "could", "state", "only", "new", "year", "some", "take",
  "come", "these", "know", "see", "use", "get", "like", "then", "first", "any",
  "work", "now", "may", "such", "give", "over", "think", "most", "even", "find",
  "day", "also", "after", "way", "many", "must", "look", "before", "great", "back",
  "through", "long", "where", "much", "should", "well", "people", "down", "own", "just",
  "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place",
  "little", "world", "very", "still", "nation", "hand", "old", "life", "tell", "write",
  "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop",
  "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another",
  "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point",
  "form", "off", "child", "few", "small", "since", "against", "ask", "late", "home",
  "interest", "large", "person", "end", "open", "public", "follow", "during", "present", "without",
  "again", "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem",
  "however", "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face",
  "fact", "group", "play", "stand", "increase", "early", "course", "change", "help", "line"
];

// ========== STATE ==========
const state = {
  mode: "time",          // time | words | quote
  amount: 30,
  punctuation: false,
  numbers: false,
  words: [],
  currentWordIndex: 0,
  currentLetterIndex: 0,
  startTime: null,
  endTime: null,
  timer: null,
  timeLeft: 30,
  active: false,
  finished: false,
  errors: 0,
  correctChars: 0,
  incorrectChars: 0,
  extraChars: 0,
  missedChars: 0,
  totalKeystrokes: 0,
  wpmHistory: [],
  rawHistory: [],
  errorHistory: [],
  wordHistory: [],
};

// ========== ELEMENTS ==========
const wordsEl = document.getElementById("words");
const inputEl = document.getElementById("wordsInput");
const caretEl = document.getElementById("caret");
const capsWarningEl = document.getElementById("capsWarning");
const liveStatsEl = document.getElementById("liveStatsMini");
const resultEl = document.getElementById("result");
const typingTestEl = document.getElementById("typingTest");
const testConfigEl = document.getElementById("testConfig");
const restartBtn = document.getElementById("restartTestButton");
const nextTestBtn = document.getElementById("nextTestButton");
const wordsWrapperEl = document.getElementById("wordsWrapper");
const logoEl = document.getElementById("logo");

// ========== TEST GENERATION ==========
function randomWord() {
  return wordList[Math.floor(Math.random() * wordList.length)];
}

function applyPunctuation(word, isFirst) {
  if (Math.random() < 0.15) {
    const symbols = [",", ".", ".", "?", "!", ";", ":", "'"];
    word += symbols[Math.floor(Math.random() * symbols.length)];
  }
  if (isFirst || Math.random() < 0.05) {
    word = word.charAt(0).toUpperCase() + word.slice(1);
  }
  return word;
}

function applyNumbers(word) {
  if (Math.random() < 0.15) {
    return String(Math.floor(Math.random() * 1000));
  }
  return word;
}

function generateWords(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    let w = randomWord();
    if (state.numbers) w = applyNumbers(w);
    if (state.punctuation) w = applyPunctuation(w, i === 0 || (list[i - 1] && /[.!?]$/.test(list[i - 1])));
    list.push(w);
  }
  return list;
}

function renderWords() {
  wordsEl.innerHTML = "";
  state.words.forEach((word, wi) => {
    const wordDiv = document.createElement("div");
    wordDiv.className = "word";
    if (wi === 0) wordDiv.classList.add("active");
    for (const ch of word) {
      const letter = document.createElement("letter");
      letter.textContent = ch;
      wordDiv.appendChild(letter);
    }
    wordsEl.appendChild(wordDiv);
  });
  updateCaret();
}

// ========== CARET ==========
function updateCaret() {
  const wordEls = wordsEl.querySelectorAll(".word");
  const currentWord = wordEls[state.currentWordIndex];
  if (!currentWord) {
    caretEl.style.opacity = "0";
    return;
  }
  caretEl.style.opacity = "1";

  const letters = currentWord.querySelectorAll("letter");
  const wordsRect = wordsEl.getBoundingClientRect();
  let left, top;

  if (state.currentLetterIndex < letters.length) {
    const letter = letters[state.currentLetterIndex];
    const rect = letter.getBoundingClientRect();
    left = rect.left - wordsRect.left;
    top = rect.top - wordsRect.top;
  } else {
    const lastLetter = letters[letters.length - 1];
    const rect = lastLetter.getBoundingClientRect();
    left = rect.right - wordsRect.left;
    top = rect.top - wordsRect.top;
  }

  caretEl.style.left = `${left}px`;
  caretEl.style.top = `${top}px`;
}

// ========== INPUT HANDLING ==========
let tabPressed = false;
let tabPressedAt = 0;

function handleKeydown(e) {
  if (state.finished) return;

  // tab + enter to restart
  if (e.key === "Tab") {
    e.preventDefault();
    tabPressed = true;
    tabPressedAt = Date.now();
    return;
  }
  if (e.key === "Enter") {
    if (tabPressed && Date.now() - tabPressedAt < 2000) {
      e.preventDefault();
      tabPressed = false;
      restart();
      return;
    }
    if (document.activeElement === inputEl) {
      return;
    }
  }
  if (e.key === "Escape") {
    e.preventDefault();
    restart();
    return;
  }

  // any other key clears the tab-pending state
  if (e.key !== "Tab" && e.key !== "Enter") {
    tabPressed = false;
  }

  // caps lock warning
  if (e.getModifierState && e.getModifierState("CapsLock")) {
    capsWarningEl.classList.remove("hidden");
  } else {
    capsWarningEl.classList.add("hidden");
  }

  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const key = e.key;

  // start the test on first valid keypress
  if (!state.active && key.length === 1 && !state.finished) {
    startTest();
  }

  if (key === "Backspace") {
    e.preventDefault();
    handleBackspace(e.ctrlKey);
    return;
  }

  if (key === " ") {
    e.preventDefault();
    handleSpace();
    return;
  }

  if (key.length === 1) {
    e.preventDefault();
    handleCharacter(key);
  }
}

function handleCharacter(ch) {
  state.totalKeystrokes++;
  const word = state.words[state.currentWordIndex];
  const wordEl = wordsEl.querySelectorAll(".word")[state.currentWordIndex];
  if (!word || !wordEl) return;

  const letters = wordEl.querySelectorAll("letter");

  if (state.currentLetterIndex < word.length) {
    const expected = word[state.currentLetterIndex];
    const letterEl = letters[state.currentLetterIndex];
    if (ch === expected) {
      letterEl.classList.add("correct");
      letterEl.classList.remove("incorrect");
      state.correctChars++;
    } else {
      letterEl.classList.add("incorrect");
      letterEl.classList.remove("correct");
      state.incorrectChars++;
      state.errors++;
    }
  } else {
    // extra letter
    const extra = document.createElement("letter");
    extra.textContent = ch;
    extra.className = "incorrect extra";
    wordEl.appendChild(extra);
    state.extraChars++;
    state.errors++;
  }

  state.currentLetterIndex++;
  updateWordError(state.currentWordIndex);
  updateCaret();
}

function handleBackspace(ctrl) {
  const wordEls = wordsEl.querySelectorAll(".word");
  const wordEl = wordEls[state.currentWordIndex];
  if (!wordEl) return;

  if (state.currentLetterIndex === 0) {
    // jump to previous word if it has incorrect/extra letters
    if (state.currentWordIndex > 0) {
      const prevIdx = state.currentWordIndex - 1;
      const prevEl = wordEls[prevIdx];
      const prevWord = state.words[prevIdx];
      const prevLetters = prevEl.querySelectorAll("letter");
      const hasErrors = Array.from(prevLetters).some(
        (l) => l.classList.contains("incorrect") || l.classList.contains("extra")
      ) || prevLetters.length < prevWord.length;
      if (hasErrors) {
        state.currentWordIndex = prevIdx;
        state.currentLetterIndex = prevLetters.length;
        wordEls[state.currentWordIndex].classList.add("active");
        wordEl.classList.remove("active");
      }
    }
    updateCaret();
    return;
  }

  if (ctrl) {
    const word = state.words[state.currentWordIndex];
    while (wordEl.children.length > word.length) {
      wordEl.removeChild(wordEl.lastChild);
    }
    wordEl.querySelectorAll("letter").forEach((l) => {
      l.classList.remove("correct", "incorrect");
    });
    state.currentLetterIndex = 0;
  } else {
    state.currentLetterIndex--;
    const letters = wordEl.querySelectorAll("letter");
    const letterEl = letters[state.currentLetterIndex];
    const word = state.words[state.currentWordIndex];
    if (state.currentLetterIndex >= word.length) {
      // remove extra letter
      letterEl.remove();
    } else if (letterEl) {
      letterEl.classList.remove("correct", "incorrect");
    }
  }
  updateWordError(state.currentWordIndex);
  updateCaret();
}

function handleSpace() {
  if (state.currentLetterIndex === 0) return;
  const word = state.words[state.currentWordIndex];
  const wordEl = wordsEl.querySelectorAll(".word")[state.currentWordIndex];
  if (!wordEl) return;

  // count missed characters (untyped letters in current word)
  if (state.currentLetterIndex < word.length) {
    state.missedChars += word.length - state.currentLetterIndex;
  }

  wordEl.classList.remove("active");
  updateWordError(state.currentWordIndex);

  state.currentWordIndex++;
  state.currentLetterIndex = 0;

  // mode-specific termination
  if (state.mode === "words" && state.currentWordIndex >= state.words.length) {
    finishTest();
    return;
  }

  // generate more words for time mode
  if (state.mode === "time" && state.currentWordIndex >= state.words.length - 20) {
    const more = generateWords(50);
    state.words.push(...more);
    for (const w of more) {
      const wordDiv = document.createElement("div");
      wordDiv.className = "word";
      for (const ch of w) {
        const letter = document.createElement("letter");
        letter.textContent = ch;
        wordDiv.appendChild(letter);
      }
      wordsEl.appendChild(wordDiv);
    }
  }

  const newWordEl = wordsEl.querySelectorAll(".word")[state.currentWordIndex];
  if (newWordEl) newWordEl.classList.add("active");

  scrollWords();
  updateCaret();
}

function updateWordError(idx) {
  const wordEl = wordsEl.querySelectorAll(".word")[idx];
  if (!wordEl) return;
  const word = state.words[idx];
  const letters = wordEl.querySelectorAll("letter");
  let hasError = false;
  letters.forEach((l, i) => {
    if (l.classList.contains("incorrect")) hasError = true;
  });
  // word also has error if its complete length doesn't match
  const isCurrent = idx === state.currentWordIndex;
  if (!isCurrent && letters.length < word.length) hasError = true;
  if (hasError) wordEl.classList.add("error");
  else wordEl.classList.remove("error");
}

function scrollWords() {
  // hide rows of completed words by adjusting margin
  const wordEls = wordsEl.querySelectorAll(".word");
  const current = wordEls[state.currentWordIndex];
  if (!current) return;
  const wordsRect = wordsEl.getBoundingClientRect();
  const currentRect = current.getBoundingClientRect();
  const lineHeight = parseFloat(getComputedStyle(wordsEl).lineHeight) || 30;
  const offsetTop = currentRect.top - wordsRect.top;

  if (offsetTop > lineHeight * 1.5) {
    const currentMargin = parseFloat(wordsEl.style.marginTop || "0");
    wordsEl.style.marginTop = `${currentMargin - lineHeight}px`;
  }
}

// ========== TIMER ==========
function startTest() {
  state.active = true;
  state.startTime = performance.now();
  liveStatsEl.classList.remove("hidden");

  if (state.mode === "time") {
    state.timeLeft = state.amount;
    updateLiveStats();
    state.timer = setInterval(() => {
      state.timeLeft--;
      updateLiveStats();
      sampleStats();
      if (state.timeLeft <= 0) finishTest();
    }, 1000);
  } else {
    updateLiveStats();
    state.timer = setInterval(() => {
      sampleStats();
      updateLiveStats();
    }, 1000);
  }

  // hide config + restart button on start (focus mode)
  testConfigEl.style.opacity = "0.25";
}

function sampleStats() {
  const elapsedMin = (performance.now() - state.startTime) / 60000;
  if (elapsedMin <= 0) return;
  const wpm = (state.correctChars / 5) / elapsedMin;
  const raw = ((state.correctChars + state.incorrectChars + state.extraChars) / 5) / elapsedMin;
  state.wpmHistory.push(Math.round(wpm));
  state.rawHistory.push(Math.round(raw));
  state.errorHistory.push(state.errors);
}

function updateLiveStats() {
  const elapsed = state.startTime ? (performance.now() - state.startTime) / 1000 : 0;
  const minutes = elapsed / 60;
  const wpm = minutes > 0 ? Math.round((state.correctChars / 5) / minutes) : 0;
  const acc = state.totalKeystrokes > 0
    ? Math.round((state.correctChars / state.totalKeystrokes) * 100)
    : 100;

  const timeChild = liveStatsEl.querySelector(".time");
  const speedChild = liveStatsEl.querySelector(".speed");
  const accChild = liveStatsEl.querySelector(".acc");

  if (state.mode === "time") {
    timeChild.textContent = state.timeLeft;
    speedChild.textContent = "";
    accChild.textContent = "";
  } else if (state.mode === "words") {
    timeChild.textContent = `${state.currentWordIndex}/${state.amount}`;
    speedChild.textContent = "";
    accChild.textContent = "";
  }
}

// ========== FINISH ==========
function finishTest() {
  if (state.finished) return;
  state.finished = true;
  state.active = false;
  state.endTime = performance.now();
  if (state.timer) clearInterval(state.timer);

  // final sample
  sampleStats();

  const elapsedMin = (state.endTime - state.startTime) / 60000;
  const wpm = Math.round((state.correctChars / 5) / elapsedMin);
  const raw = Math.round(((state.correctChars + state.incorrectChars + state.extraChars) / 5) / elapsedMin);
  const totalTyped = state.correctChars + state.incorrectChars + state.extraChars;
  const acc = totalTyped > 0
    ? Math.round((state.correctChars / state.totalKeystrokes) * 100)
    : 0;

  // consistency = coefficient of variation of wpm samples, scaled
  let consistency = 0;
  if (state.wpmHistory.length > 1) {
    const mean = state.wpmHistory.reduce((a, b) => a + b, 0) / state.wpmHistory.length;
    const variance = state.wpmHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / state.wpmHistory.length;
    const stdev = Math.sqrt(variance);
    const cv = mean > 0 ? stdev / mean : 1;
    consistency = Math.max(0, Math.round((1 - cv) * 100));
  }

  document.getElementById("resultWpm").textContent = wpm || 0;
  document.getElementById("resultAcc").textContent = `${acc}%`;
  document.getElementById("resultRaw").textContent = raw || 0;
  document.getElementById("resultConsistency").textContent = `${consistency}%`;
  document.getElementById("resultChars").textContent =
    `${state.correctChars}/${state.incorrectChars}/${state.extraChars}/${state.missedChars}`;
  document.getElementById("resultTime").textContent =
    `${Math.round((state.endTime - state.startTime) / 1000)}s`;
  document.getElementById("resultTestType").innerHTML =
    `${state.mode} ${state.amount}<br>english${state.punctuation ? "<br>punctuation" : ""}${state.numbers ? "<br>numbers" : ""}`;

  typingTestEl.classList.add("hidden");
  testConfigEl.classList.add("hidden");
  resultEl.classList.remove("hidden");
  caretEl.style.opacity = "0";

  drawChart();
}

// ========== CHART ==========
let chartInstance = null;
function drawChart() {
  const ctx = document.getElementById("resultChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  const labels = state.wpmHistory.map((_, i) => i + 1);

  const css = getComputedStyle(document.documentElement);
  const mainColor = css.getPropertyValue("--main-color").trim();
  const subColor = css.getPropertyValue("--sub-color").trim();
  const errorColor = css.getPropertyValue("--error-color").trim();
  const textColor = css.getPropertyValue("--text-color").trim();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "wpm",
          data: state.wpmHistory,
          borderColor: mainColor,
          backgroundColor: "transparent",
          tension: 0.3,
          yAxisID: "y",
          pointRadius: 2,
        },
        {
          label: "raw",
          data: state.rawHistory,
          borderColor: subColor,
          backgroundColor: "transparent",
          tension: 0.3,
          yAxisID: "y",
          pointRadius: 2,
        },
        {
          label: "errors",
          data: state.errorHistory.map((e, i) =>
            i === 0 ? e : Math.max(0, e - state.errorHistory[i - 1])
          ),
          borderColor: errorColor,
          backgroundColor: errorColor,
          type: "scatter",
          yAxisID: "y1",
          pointStyle: "crossRot",
          pointRadius: 4,
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      scales: {
        x: {
          ticks: { color: subColor },
          grid: { color: "transparent" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: subColor },
          grid: { color: subColor + "33" },
        },
        y1: {
          beginAtZero: true,
          position: "right",
          ticks: { color: errorColor, stepSize: 1, precision: 0 },
          grid: { display: false },
        },
      },
    },
  });
}

// ========== RESTART ==========
function restart(animate = true) {
  if (state.timer) clearInterval(state.timer);

  const performReset = () => {
    Object.assign(state, {
      words: [],
      currentWordIndex: 0,
      currentLetterIndex: 0,
      startTime: null,
      endTime: null,
      timer: null,
      timeLeft: state.mode === "time" ? state.amount : 0,
      active: false,
      finished: false,
      errors: 0,
      correctChars: 0,
      incorrectChars: 0,
      extraChars: 0,
      missedChars: 0,
      totalKeystrokes: 0,
      wpmHistory: [],
      rawHistory: [],
      errorHistory: [],
    });

    wordsEl.style.marginTop = "0px";
    resultEl.classList.add("hidden");
    typingTestEl.classList.remove("hidden");
    testConfigEl.classList.remove("hidden");
    testConfigEl.style.opacity = "1";
    liveStatsEl.classList.add("hidden");
    capsWarningEl.classList.add("hidden");

    const wordCount = state.mode === "time" ? 60 : state.amount;
    state.words = generateWords(wordCount);
    renderWords();
    inputEl.focus();
  };

  if (!animate) {
    performReset();
    return;
  }

  wordsWrapperEl.classList.add("fading");
  setTimeout(() => {
    performReset();
    requestAnimationFrame(() => {
      wordsWrapperEl.classList.remove("fading");
    });
  }, 125);
}

// ========== CONFIG BUTTONS ==========
document.querySelectorAll('#testMode .textButton').forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.test;
    if (mode !== "time" && mode !== "words") return; // only these are wired up
    document.querySelectorAll('#testMode .textButton').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.mode = mode;

    // refresh amount buttons appropriate to mode
    const amounts = mode === "time" ? [15, 30, 60, 120] : [10, 25, 50, 100];
    const amountBtns = document.querySelectorAll('#testAmount .textButton[data-amount]');
    amountBtns.forEach((b, i) => {
      if (amounts[i] !== undefined && b.dataset.amount !== "custom") {
        b.dataset.amount = amounts[i];
        b.textContent = amounts[i];
      }
    });
    state.amount = amounts[1];
    document.querySelectorAll('#testAmount .textButton').forEach((b) => b.classList.remove("active"));
    amountBtns[1].classList.add("active");

    restart();
  });
});

document.querySelectorAll('#testAmount .textButton').forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.amount === "custom") return;
    document.querySelectorAll('#testAmount .textButton').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.amount = parseInt(btn.dataset.amount, 10);
    restart();
  });
});

document.querySelectorAll('#punctuationMode .textButton').forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    btn.classList.toggle("active");
    if (mode === "punctuation") state.punctuation = btn.classList.contains("active");
    if (mode === "numbers") state.numbers = btn.classList.contains("active");
    restart();
  });
});

restartBtn.addEventListener("click", restart);
if (nextTestBtn) nextTestBtn.addEventListener("click", restart);

logoEl.addEventListener("click", (e) => {
  e.preventDefault();
  location.reload();
});

// ========== KEYBOARD ==========
document.addEventListener("keydown", handleKeydown);
document.addEventListener("click", () => inputEl.focus());

// reposition caret on resize
window.addEventListener("resize", () => {
  updateCaret();
});

// ========== INIT ==========
restart(false);
inputEl.focus();

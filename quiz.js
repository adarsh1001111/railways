// quiz.js - modularized quiz logic supporting multiple papers, navigation, sidebar, review
let papers = {};
let quizStarted = false;

// default paper id
let currentPaperId = "2025-06-01";
let quizData = [];
let currentQuestionIndex = 0;
let userScore = 0;
let selectedOptionKey = null;
let isAnswerSubmitted = false;
let userAnswers = [];
let hintUsed = [];
// submittedFlags removed — answers are saved immediately and final scoring happens at finish

function registerPaper(id, data) {
  papers[id] = data;
}

function loadPaper(id) {
  currentPaperId = id;
  quizData = JSON.parse(JSON.stringify(papers[id] || []));
  // ensure length and initialize answers
  if (!Array.isArray(quizData)) quizData = [];
  userAnswers = new Array(quizData.length).fill(null);
  hintUsed = new Array(quizData.length).fill(false);
  // no per-question submitted flags; keep answers array only
  currentQuestionIndex = 0;
  userScore = 0;
  selectedOptionKey = null;
  isAnswerSubmitted = false;
  // update totals in UI
  const totalEl = document.getElementById("total-count");
  if (totalEl) totalEl.innerText = quizData.length;
  const totalEl2 = document.getElementById("total-count-2");
  if (totalEl2) totalEl2.innerText = quizData.length;
  renderSidebar();
  loadQuestion();
  startTimer();
}

function renderSidebar() {
  const container = document.getElementById("sidebar-pills");
  container.innerHTML = "";
  for (let i = 0; i < quizData.length; i++) {
    const pill = document.createElement("div");
    pill.className = "q-pill unanswered";
    pill.innerText = i + 1;
    pill.onclick = () => goToQuestion(i);
    pill.id = `pill-${i}`;
    container.appendChild(pill);
  }
  updateSidebarState();
}

function updateSidebarState() {
  for (let i = 0; i < quizData.length; i++) {
    const pill = document.getElementById(`pill-${i}`);
    if (!pill) continue;
    pill.classList.remove(
      "current",
      "answered",
      "wrong",
      "unanswered",
      "saved",
    );
    if (i === currentQuestionIndex) pill.classList.add("current");
    const ua = userAnswers[i];
    if (ua) pill.classList.add("saved");
    else pill.classList.add("unanswered");
  }
  // update unanswered chart count
  const remaining = userAnswers.filter((x) => !x).length;
  document.getElementById("unanswered-count").innerText = remaining;
}

function loadQuestion() {
  isAnswerSubmitted = false;
  selectedOptionKey = null;
  const currentQuestion = quizData[currentQuestionIndex];
  document.getElementById("current-idx").innerText = currentQuestionIndex + 1;
  const actionBtn = document.getElementById("action-btn");
  if (actionBtn) actionBtn.innerText = "Submit Answer";
  const progressEl = document.getElementById("progress");
  const totalLen = Math.max(1, quizData.length || 0);
  const progressPercent = (currentQuestionIndex / totalLen) * 100;
  if (progressEl) progressEl.style.width = `${progressPercent}%`;
  const feedbackBox = document.getElementById("feedback");
  if (feedbackBox) {
    feedbackBox.className = "feedback-box";
    feedbackBox.style.display = "none";
  }
  const container = document.getElementById("question-container");
  let optionsHTML = "";
  currentQuestion.opts.forEach((opt) => {
    optionsHTML += `
      <div class="option-item" id="opt-block-${opt.key}" onclick="selectOption('${opt.key}')">
        <input type="radio" name="quiz-opt" id="radio-${opt.key}" value="${opt.key}">
        <div class="option-text"><span class="opt-en">(${opt.key}) ${opt.en}</span><span class="opt-hi">${opt.hi}</span></div>
      </div>`;
  });
  const hintButtonLabel = hintUsed[currentQuestionIndex]
    ? "💡 Hide hint"
    : "💡 Show hint";
  container.innerHTML = `
    <div class="question-card"><div class="lang-en">${currentQuestionIndex + 1}. ${currentQuestion.en}</div><div class="lang-hi">${currentQuestion.hi}</div></div>
    <div class="hint-row">
      <button class="btn hint small" id="hint-btn" onclick="showHint()">${hintButtonLabel}</button>
      <div id="hint-box" class="hint-box" style="display: none;"></div>
    </div>
    <div class="options-list">${optionsHTML}</div>`;
  // update the footer hint button label too
  const footerHintBtn = document.querySelector(".quiz-footer .btn.hint");
  if (footerHintBtn) footerHintBtn.innerText = hintButtonLabel;

  // restore prev
  const prev = userAnswers[currentQuestionIndex];
  if (prev) {
    selectedOptionKey = prev;
    const r = document.getElementById(`radio-${prev}`);
    if (r) r.checked = true;
  }
  if (hintUsed[currentQuestionIndex]) {
    const correctKey = currentQuestion.ans;
    const correctBlock = document.getElementById(`opt-block-${correctKey}`);
    if (correctBlock) correctBlock.classList.add("correct");
    if (selectedOptionKey && selectedOptionKey !== correctKey) {
      const wrongBlock = document.getElementById(
        `opt-block-${selectedOptionKey}`,
      );
      if (wrongBlock) wrongBlock.classList.add("wrong");
    }
    const hintBox = document.getElementById("hint-box");
    if (hintBox) {
      hintBox.style.display = "block";
      hintBox.innerHTML = `Correct answer: <strong>(${currentQuestion.ans}) ${currentQuestion.opts.find((o) => o.key === currentQuestion.ans)?.en}</strong>`;
    }
  }
  // do not reveal correctness until finish; options remain enabled for change
  updateSidebarState();
  document.getElementById("quiz-body-scroll").scrollTop = 0;
}

function selectOption(key) {
  selectedOptionKey = key;
  // persist selection immediately (saved) so it shows in sidebar
  userAnswers[currentQuestionIndex] = key;
  const radio = document.getElementById(`radio-${key}`);
  if (radio) radio.checked = true;
  updateSidebarState();
}

function submitAnswer() {
  // deprecated: submission is handled at finish; keep for compatibility but no-op
  console.warn(
    "submitAnswer() is deprecated; finish the paper to compute results.",
  );
}

function handleSubmit() {
  if (!isAnswerSubmitted) submitAnswer();
  else nextQuestion();
}

function nextQuestion() {
  if (currentQuestionIndex < quizData.length - 1) {
    currentQuestionIndex++;
    loadQuestion();
  } else showFinalResults(true);
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion();
  }
}

function skipQuestion() {
  // move forward without selecting or submitting
  currentQuestionIndex = Math.min(
    quizData.length - 1,
    currentQuestionIndex + 1,
  );
  loadQuestion();
}

function resetSelection() {
  if (isAnswerSubmitted) return;
  selectedOptionKey = null;
  userAnswers[currentQuestionIndex] = null;
  document
    .querySelectorAll('input[name="quiz-opt"]')
    .forEach((i) => (i.checked = false));
  updateSidebarState();
}

function goToQuestion(i) {
  currentQuestionIndex = i;
  loadQuestion();
}

function showHint() {
  if (!quizData[currentQuestionIndex]) return;
  hintUsed[currentQuestionIndex] = !hintUsed[currentQuestionIndex];
  loadQuestion();
}

function populatePaperList() {
  const chooser = document.getElementById("paper-chooser");
  const sidebarSelect = document.getElementById("paper-select");
  if (chooser) chooser.innerHTML = "";
  if (sidebarSelect) sidebarSelect.innerHTML = "";
  fetch("papers/index.json")
    .then((r) => r.json())
    .then((list) => {
      list.forEach((entry) => {
        const id = entry.id || (entry.file || "").replace(".json", "");
        const label = entry.title || id;
        if (chooser) {
          const o = document.createElement("option");
          o.value = id;
          o.innerText = label;
          chooser.appendChild(o);
        }
        if (sidebarSelect) {
          const o2 = document.createElement("option");
          o2.value = id;
          o2.innerText = label;
          sidebarSelect.appendChild(o2);
        }
      });
      // ensure chooser has a default selection after successful load
      if (chooser && chooser.options.length > 0 && !chooser.value)
        chooser.value = chooser.options[0].value;
      if (
        sidebarSelect &&
        sidebarSelect.options.length > 0 &&
        !sidebarSelect.value
      )
        sidebarSelect.value = sidebarSelect.options[0].value;
    })
    .catch(() => {
      // fallback to in-memory papers
      Object.keys(papers).forEach((id) => {
        const optLabel = id; // user can change label if needed
        if (chooser) {
          const o = document.createElement("option");
          o.value = id;
          o.innerText = optLabel;
          chooser.appendChild(o);
        }
        if (sidebarSelect) {
          const o2 = document.createElement("option");
          o2.value = id;
          o2.innerText = optLabel;
          sidebarSelect.appendChild(o2);
        }
      });
      // ensure chooser has a default selection so startPaper() picks something
      if (chooser && chooser.options.length > 0 && !chooser.value)
        chooser.value = chooser.options[0].value;
      if (
        sidebarSelect &&
        sidebarSelect.options.length > 0 &&
        !sidebarSelect.value
      )
        sidebarSelect.value = sidebarSelect.options[0].value;
    });
}

function showQuizPanel() {
  const panel = document.getElementById("paper-chooser-panel");
  if (panel) panel.style.display = "none";
  const qwrap = document.querySelector(".quiz-wrapper");
  if (qwrap) qwrap.style.display = "grid";
  const quizWindow = document.getElementById("quiz-window");
  if (quizWindow) quizWindow.style.display = "grid";
  const resultWindow = document.getElementById("result-window");
  if (resultWindow) resultWindow.style.display = "none";
  const paperSelect = document.querySelector(".paper-select");
  if (paperSelect) paperSelect.style.display = "none";
}

function showChooserPanel() {
  const panel = document.getElementById("paper-chooser-panel");
  if (panel) panel.style.display = "flex";
  const qwrap = document.querySelector(".quiz-wrapper");
  if (qwrap) qwrap.style.display = "none";
  const quizWindow = document.getElementById("quiz-window");
  if (quizWindow) quizWindow.style.display = "none";
  const resultWindow = document.getElementById("result-window");
  if (resultWindow) resultWindow.style.display = "none";
  const paperSelect = document.querySelector(".paper-select");
  if (paperSelect) paperSelect.style.display = "flex";
}

function startPaper() {
  const chooser = document.getElementById("paper-chooser");
  let id = null;
  const sidebarSelect = document.getElementById("paper-select");
  if (chooser && chooser.value) id = chooser.value;
  else if (sidebarSelect && sidebarSelect.value) id = sidebarSelect.value;
  if (!id) return alert("Pick a paper");
  // Prefer loading from the paper file in /papers/{id}.json so the chooser selects actual files
  fetch(`papers/${id}.json`)
    .then((r) => {
      if (!r.ok) throw new Error("not found");
      return r.json();
    })
    .then((data) => {
      registerPaper(id, data);
      quizStarted = true;
      showQuizPanel();
      loadPaper(id);
    })
    .catch(() => {
      // fetch failed (likely file:// blocking). Try embedded script then in-memory as fallback.
      // try exact embedded id first
      let embed = document.getElementById(`paper-${id}`);
      if (!embed) {
        const scripts = Array.from(
          document.querySelectorAll(
            'script[type="application/json"][id^="paper-"]',
          ),
        );
        embed = scripts.find(
          (s) =>
            s.id === `paper-${id}` || s.id.endsWith(id) || s.id.includes(id),
        );
      }
      if (embed && embed.textContent && embed.textContent.trim().length) {
        try {
          const data = JSON.parse(embed.textContent);
          registerPaper(id, data);
          quizStarted = true;
          showQuizPanel();
          loadPaper(id);
          return;
        } catch (e) {
          console.warn("embedded paper parse failed", embed.id, e);
        }
      }
      // if we already have the paper registered in memory, use it
      if (papers[id]) {
        registerPaper(id, papers[id]);
        quizStarted = true;
        showQuizPanel();
        loadPaper(id);
        return;
      }
      alert(
        "Unable to load selected paper file. Ensure /papers/" +
          id +
          ".json exists or run a local server; falling back to embedded data failed.",
      );
    });
}

function returnToChooser() {
  quizStarted = false;
  showChooserPanel();
}

function finishAndReview() {
  // compute score from recorded answers
  userScore = 0;
  for (let i = 0; i < quizData.length; i++)
    if (userAnswers[i] && userAnswers[i] === quizData[i].ans) userScore++;
  stopTimer();
  showFinalResults(true);
}

function showFinalResults(detailed = false) {
  document.getElementById("quiz-window").style.display = "none";
  document.getElementById("result-window").style.display = "flex";
  document.getElementById("score").innerText = userScore;
  const messageBox = document.getElementById("perf-msg");
  if (userScore >= 95) messageBox.innerText = "Outstanding!";
  else if (userScore >= 75) messageBox.innerText = "Superb attempt!";
  else messageBox.innerText = "Good effort.";
  const reviewList = document.getElementById("review-list");
  reviewList.innerHTML = "";
  if (detailed) {
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      const ua = userAnswers[i];
      const isCorrect = ua && ua === q.ans;
      const row = document.createElement("div");
      const statusClass = !ua ? "unanswered" : isCorrect ? "correct" : "wrong";
      row.className = `review-row ${statusClass}`;

      const titleRow = document.createElement("div");
      titleRow.className = "review-title";
      const qTitle = document.createElement("h3");
      qTitle.innerHTML = `<strong>Q${i + 1}.</strong> ${q.en}`;
      const statusBadge = document.createElement("div");
      statusBadge.className = "review-status";
      statusBadge.innerText = !ua
        ? "Not answered"
        : isCorrect
          ? "Correct"
          : "Incorrect";
      titleRow.appendChild(qTitle);
      titleRow.appendChild(statusBadge);

      const optionList = document.createElement("div");
      optionList.className = "review-options";
      q.opts.forEach((opt) => {
        const optRow = document.createElement("div");
        optRow.className = "review-option";
        if (opt.key === q.ans) optRow.classList.add("correct");
        if (ua === opt.key) optRow.classList.add("selected");
        if (ua && ua === opt.key && opt.key !== q.ans)
          optRow.classList.add("wrong");

        const label = document.createElement("span");
        label.innerText = `${opt.key}. ${opt.en}`;
        const note = document.createElement("small");
        if (opt.key === q.ans && ua === q.ans)
          note.innerText = "Correct answer";
        else if (opt.key === q.ans) note.innerText = "Correct answer";
        else if (ua === opt.key) note.innerText = "Your choice";
        else note.innerText = "";

        optRow.appendChild(label);
        optRow.appendChild(note);
        optionList.appendChild(optRow);
      });

      const meta = document.createElement("div");
      meta.className = "meta";
      const yourTxt = ua
        ? `(${ua}) ${q.opts.find((o) => o.key === ua)?.en || "—"}`
        : "Not Answered";
      const corrTxt = `(${q.ans}) ${q.opts.find((o) => o.key === q.ans).en}`;
      meta.innerHTML = `<span><strong>Your:</strong> ${yourTxt}</span><span><strong>Correct:</strong> ${corrTxt}</span>`;

      row.appendChild(titleRow);
      row.appendChild(optionList);
      row.appendChild(meta);
      reviewList.appendChild(row);
    }
  }
}

function downloadReview() {
  let out = `Score: ${userScore} / ${quizData.length}\n\n`;
  quizData.forEach((q, i) => {
    const ua = userAnswers[i];
    const uaText = ua
      ? `(${ua}) ${q.opts.find((o) => o.key === ua)?.en || ""}`
      : "Not Answered";
    const caText = `(${q.ans}) ${q.opts.find((o) => o.key === q.ans).en}`;
    out += `Q${i + 1}. ${q.en}\nYour: ${uaText}\nCorrect: ${caText}\n\n`;
  });
  const blob = new Blob([out], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quiz-review-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Timer (elapsed) helpers
let timerSeconds = 0;
let timerInterval = null;
function formatTime(s) {
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
function startTimer() {
  timerSeconds = 0;
  const el = document.getElementById("timer");
  if (el) el.innerText = formatTime(timerSeconds);
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerSeconds++;
    if (el) el.innerText = formatTime(timerSeconds);
  }, 1000);
}
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

// bootstrap register default paper (sample). Replace or add more papers via registerPaper().
document.addEventListener("DOMContentLoaded", () => {
  const sample = [
    {
      en: "In which Article of the Indian Constitution, Hindi in Devanagri Script is declared as the Official Language of the Union?",
      hi: "भारतीय संविधान के किस अनुच्छेद में देवनागरी लिपि में हिंदी को संघ की राजभाषा घोषित किया गया है?",
      opts: [
        {
          key: "A",
          en: "None of the given Options is correct.",
          hi: "दिए गए विकल्पों में से कोई भी सही नहीं है।",
        },
        {
          key: "B",
          en: "Article 240 of the Constitution.",
          hi: "संविधान का अनुच्छेद 240 के अनुसार।",
        },
        {
          key: "C",
          en: "Article 360 of the Constitution.",
          hi: "संविधान का अनुच्छेद 360 के अनुसार।",
        },
        {
          key: "D",
          en: "Article 343 (1) of the Constitution.",
          hi: "संविधान के अनुच्छेद 343(1) के अनुसार।",
        },
      ],
      ans: "D",
    },
    {
      en: "As per Official Language Rules 1976, what percentage of employees has to acquire the Working Knowledge of Hindi?",
      hi: "राजभाषा नियम 1976 के अनुसार...",
      opts: [
        { key: "A", en: "50%", hi: "50%" },
        {
          key: "B",
          en: "None of the given Options is correct.",
          hi: "दिए गए विकल्पों में से कोई भी सही नहीं है।",
        },
        { key: "C", en: "75%", hi: "75%" },
        { key: "D", en: "80%", hi: "80%" },
      ],
      ans: "D",
    },
    {
      en: "Who is the Chairman of the Parliamentary Committee on Official Language?",
      hi: "संसदीय राजभाषा समिति के अध्यक्ष कौन हैं?",
      opts: [
        { key: "A", en: "Union Home Minister", hi: "केंद्रीय गृह मंत्री" },
        { key: "B", en: "Union Finance Minister", hi: "केंद्रीय वित्त मंत्री" },
        {
          key: "C",
          en: "Union Textiles Minister",
          hi: "केंद्रीय कपड़ा मंत्री",
        },
        {
          key: "D",
          en: "None of the given Options is correct.",
          hi: "दिए गए विकल्पों में से कोई भी सही नहीं है।",
        },
      ],
      ans: "A",
    },
    {
      en: "Which Rule of the Railway Services deals with Observance of Government Policies?",
      hi: "रेलवे सेवा (आचरण) नियम...",
      opts: [
        { key: "A", en: "Rule 3 A", hi: "नियम 3 ए" },
        { key: "B", en: "Rule 3 B", hi: "नियम 3 बी" },
        { key: "C", en: "Rule 3 C", hi: "नियम 3 सी" },
        {
          key: "D",
          en: "None",
          hi: "दिए गए विकल्पों में से कोई भी सही नहीं है।",
        },
      ],
      ans: "B",
    },
    {
      en: "What is the maximum period of extraordinary leave for a temporary Railway Servant?",
      hi: "अधिकतम अवधि क्या है?",
      opts: [
        { key: "A", en: "None", hi: "—" },
        { key: "B", en: "Four months", hi: "चार महीने" },
        { key: "C", en: "Three months", hi: "तीन महीने" },
        { key: "D", en: "Six months", hi: "छह महीने" },
      ],
      ans: "D",
    },
  ];

  // optional: replicate to a larger set for demo if needed
  while (sample.length < 20) {
    const src = sample[sample.length % sample.length];
    sample.push({
      ...src,
      en: `[Demo Q-${sample.length + 1}] ${src.en}`,
      hi: src.hi,
    });
  }

  populatePaperList();
});

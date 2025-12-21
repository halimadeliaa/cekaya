function $(sel, root=document){ return root.querySelector(sel); }

function setCookie(name, value, days=30){
  const d = new Date();
  d.setTime(d.getTime() + (days*24*60*60*1000));
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/`;
}
function getCookie(name){
  const key = encodeURIComponent(name) + "=";
  const parts = document.cookie.split("; ");
  for (const p of parts){
    if (p.startsWith(key)) return decodeURIComponent(p.slice(key.length));
  }
  return "";
}

function formatTime(sec){
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}

export function mountQuiz(rootEl, questions, options = {}){
  if (!rootEl) return;

  const {
    moduleKey = "modul",
    durationSeconds = 7 * 60
  } = options;

  const NAME_LS_KEY = "cekaya_quiz_name";
  const NAME_COOKIE_KEY = "cekaya_name";

  let idx = 0;
  let correct = 0;
  let wrong = 0;

  let remaining = durationSeconds;
  let timerId = null;
  let startedAtMs = 0;

  let answered = false;
  let userName = "";

  function readName(){
    const ls = (localStorage.getItem(NAME_LS_KEY) || "").trim();
    const ck = (getCookie(NAME_COOKIE_KEY) || "").trim();
    return ls || ck || "";
  }

  function saveName(name){
    const clean = (name || "").trim();
    localStorage.setItem(NAME_LS_KEY, clean);
    setCookie(NAME_COOKIE_KEY, clean, 30);
  }

  function stopTimer(){
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function startTimer(){
    stopTimer();
    startedAtMs = Date.now();

    timerId = setInterval(() => {
      remaining -= 1;

      const t = $("#qtimer", rootEl);
      if (t) t.textContent = formatTime(remaining);

      const timeBar = $("#timeBar", rootEl);
      if (timeBar){
        const used = durationSeconds - remaining;
        const pct = Math.round((used / durationSeconds) * 100);
        timeBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      }

      if (remaining <= 0){
        remaining = 0;
        stopTimer();
        renderEnd(true);
      }
    }, 1000);
  }

  function shell(){
    return `
      <div class="quiz-shell">
        <div class="quiz-card">
          <div class="quiz-head">
            <div>
              <div class="quiz-title">Kuis Interaktif</div>
              <div class="small">${moduleKey}</div>
            </div>
            <div class="timer-pill">⏳ Waktu: <b id="qtimer">${formatTime(remaining)}</b></div>
          </div>

          <div class="small" style="margin-top:10px;font-weight:700">Progress waktu</div>
          <div class="progress"><div id="timeBar" style="width:0%"></div></div>

          <div class="small" style="margin-top:10px;font-weight:700">Progress soal</div>
          <div class="progress"><div id="qBar" style="width:0%"></div></div>
        </div>

        <div id="qContent" class="quiz-card"></div>
      </div>
    `;
  }

  function renderStart(){
    userName = readName();
    rootEl.innerHTML = shell();

    const content = $("#qContent", rootEl);
    content.innerHTML = `
      <h3 style="margin:0 0 6px">Sebelum mulai</h3>
      <p class="small" style="margin:0 0 10px">
        Isi nama dulu ya. Nama ini disimpan di perangkatmu (cookie/localStorage).
      </p>

      <div class="field">
        <label>Nama</label>
        <input id="nameInput" placeholder="Contoh: Putri" value="${userName.replaceAll('"',"&quot;")}"/>
      </div>

      <div class="btns" style="margin-top:12px">
        <button class="btn primary" id="btnStart" type="button">Mulai Kuis</button>
      </div>

      <div class="notice small" style="margin-top:12px">
        Aturan: soal tampil 1 per 1. Setelah kamu menjawab, koreksi langsung muncul.
        Untuk lanjut, klik Next (manual).
      </div>
    `;

    $("#btnStart", rootEl).addEventListener("click", ()=>{
      const v = ($("#nameInput", rootEl).value || "").trim();
      if (!v){
        alert("Nama wajib diisi dulu ya 🙂");
        return;
      }
      saveName(v);
      userName = v;

      idx = 0;
      correct = 0;
      wrong = 0;
      answered = false;

      remaining = durationSeconds;
      startTimer();
      renderQuestion();
    });
  }

  function updateBars(){
    const qBar = $("#qBar", rootEl);
    if (qBar){
      const pct = Math.round(((idx) / questions.length) * 100);
      qBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    }
  }

  function lockChoices(){
    rootEl.querySelectorAll(".choice").forEach(c => c.classList.add("disabled"));
  }

  function renderQuestion(){
    rootEl.innerHTML = shell();
    updateBars();

    const content = $("#qContent", rootEl);
    const total = questions.length;
    const q = questions[idx];

    answered = false;

    content.innerHTML = `
      <div class="quiz-meta">
        <div class="small"><b>${userName}</b> • Soal ${idx+1}/${total}</div>
        <div class="small">Benar: <b>${correct}</b> • Salah: <b>${wrong}</b></div>
      </div>

      <div class="quiz-q">${q.q}</div>

      <div class="quiz" style="margin-top:10px">
        ${q.c.map((txt,i)=>`
          <label class="choice" data-i="${i}">
            <input type="radio" name="ans" value="${i}">
            <div><b>${String.fromCharCode(65+i)}.</b> ${txt}</div>
          </label>
        `).join("")}
      </div>

      <div id="feedback"></div>

      <div class="btns" style="margin-top:12px">
        <button class="btn primary" id="btnNext" type="button" disabled>
          ${idx === total-1 ? "Selesai" : "Next →"}
        </button>
      </div>

      <div class="notice small" style="margin-top:12px">
        Pilih jawaban untuk melihat koreksi. Lanjut dengan tombol Next.
      </div>
    `;

    content.querySelectorAll(".choice").forEach(choice=>{
      choice.addEventListener("click", ()=>{
        if (answered) return;
        const selected = Number(choice.dataset.i);
        checkAnswer(selected);
      });
    });

    $("#btnNext", rootEl).addEventListener("click", ()=>{
      if (!answered) return;
      if (idx >= total - 1){
        renderEnd(false);
      } else {
        idx += 1;
        updateBars();
        renderQuestion();
      }
    });
  }

  function checkAnswer(selectedIndex){
    const q = questions[idx];
    const fb = $("#feedback", rootEl);

    const isCorrect = selectedIndex === q.a;
    answered = true;
    lockChoices();

    if (isCorrect) correct += 1;
    else wrong += 1;

    fb.innerHTML = `
      <div class="quiz-feedback ${isCorrect ? "good" : "bad"}">
        <b>${isCorrect ? "✅ Jawaban kamu benar" : "❌ Jawaban kamu kurang tepat"}</b>
        <div class="small" style="margin-top:6px">
          Jawaban benar: <b>${String.fromCharCode(65 + q.a)}. ${q.c[q.a]}</b>
        </div>
        ${q.e ? `<div class="small" style="margin-top:6px">${q.e}</div>` : ""}
      </div>
    `;

    $("#btnNext", rootEl).disabled = false;

    const qBar = $("#qBar", rootEl);
    if (qBar){
      const pct = Math.round(((idx+1) / questions.length) * 100);
      qBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    }
  }

  function renderEnd(isTimeout){
    stopTimer();

    const usedSec = Math.min(durationSeconds, Math.round((Date.now() - startedAtMs) / 1000));
    const usedLabel = formatTime(isTimeout ? durationSeconds : usedSec);
    const remainLabel = formatTime(remaining);

    rootEl.innerHTML = shell();

    const content = $("#qContent", rootEl);
    content.innerHTML = `
      <h3 style="margin:0 0 6px">Sesi selesai ${isTimeout ? "(waktu habis)" : ""}</h3>
      <p class="small" style="margin:0 0 10px">Terima kasih, <b>${userName}</b>! Ini hasil kuis kamu:</p>

      <div class="kpi">
        <div class="item"><b>${correct}</b><span class="small">Benar</span></div>
        <div class="item"><b>${wrong}</b><span class="small">Salah</span></div>
        <div class="item"><b>${usedLabel}</b><span class="small">Waktu terpakai</span></div>
      </div>

      <div class="card soft" style="margin-top:12px">
        <p style="margin:0"><b>Sisa waktu:</b> ${remainLabel}</p>
        <p class="small" style="margin:8px 0 0">
          Kamu bisa ulangi kuis untuk memperbaiki hasil.
        </p>
      </div>

      <div class="btns" style="margin-top:12px">
        <button class="btn primary" id="btnRetry" type="button">Ulangi Kuis</button>
        <a class="btn" href="course.html">Kembali ke Course</a>
      </div>

      <div class="notice small" style="margin-top:12px">
        *Kuis ini untuk latihan pemahaman (edukasi).
      </div>
    `;

    $("#btnRetry", rootEl).addEventListener("click", ()=>{
      idx = 0;
      correct = 0;
      wrong = 0;
      answered = false;
      remaining = durationSeconds;
      startTimer();
      renderQuestion();
    });
  }

  if (!Array.isArray(questions) || questions.length === 0){
    rootEl.innerHTML = `
      <div class="card soft">
        <b>Kuis belum tersedia.</b>
        <div class="small" style="margin-top:6px">Silakan isi data quiz di course-data.js</div>
      </div>
    `;
    return;
  }

  renderStart();
}

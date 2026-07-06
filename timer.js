(function () {
  const state = {
    mode: "timer",
    running: false,
    selectedMinutes: 5,
    customMinutes: 20,
    timerDurationMs: 5 * 60 * 1000,
    timerRemainingMs: 5 * 60 * 1000,
    stopwatchElapsedMs: 0,
    lastTick: null,
    rafId: null,
    audioContext: null
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function pad(value, digits = 2) {
    return String(Math.floor(value)).padStart(digits, "0");
  }

  function formatTimer(ms) {
    const safeMs = Math.max(0, ms);
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  function formatStopwatch(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
  }

  function setRingProgress() {
    const ring = $(".timer-ring");
    if (!ring) return;

    if (state.mode === "timer") {
      const elapsed = state.timerDurationMs - state.timerRemainingMs;
      const progress = state.timerDurationMs > 0 ? Math.min(1, Math.max(0, elapsed / state.timerDurationMs)) : 0;
      ring.style.setProperty("--timer-progress", `${progress * 360}deg`);
    } else {
      const progress = ((state.stopwatchElapsedMs % 60000) / 60000) * 360;
      ring.style.setProperty("--timer-progress", `${progress}deg`);
    }
  }

  function render() {
    const display = $("#timerDisplay");
    const subLabel = $("#timerSubLabel");
    const startButton = $("#timerStart");

    if (!display || !subLabel || !startButton) return;

    display.classList.toggle("stopwatch-display", state.mode === "stopwatch");

    if (state.mode === "timer") {
      display.textContent = formatTimer(state.timerRemainingMs);
      subLabel.textContent = state.timerRemainingMs <= 0 ? "⏰ Czas minął" : "🔔 Alarm na końcu";
    } else {
      display.textContent = formatStopwatch(state.stopwatchElapsedMs);
      subLabel.textContent = "Stoper";
    }

    startButton.textContent = state.running ? "▶ Start" : "▶ Start";
    setRingProgress();
  }

  function unlockAudio() {
    if (state.audioContext) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    state.audioContext = new AudioCtx();
  }

  function playAlarm() {
    unlockAudio();

    if (navigator.vibrate) {
      navigator.vibrate([220, 90, 220, 90, 360]);
    }

    const ctx = state.audioContext;
    if (!ctx) return;

    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    [0, 0.28, 0.56].forEach((offset) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.24);
    });
  }

  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    state.running = false;
    state.lastTick = null;

    $$(".mode-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === mode);
    });

    render();
  }

  function setTimerMinutes(minutes, isCustom = false) {
    state.selectedMinutes = minutes;
    state.timerDurationMs = minutes * 60 * 1000;
    state.timerRemainingMs = state.timerDurationMs;
    state.running = false;
    state.lastTick = null;
    setMode("timer");

    $$(".preset-button").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.minutes) === minutes && !isCustom);
    });

    $("#customTimerButton")?.classList.toggle("active", isCustom);
    render();
  }

  function promptCustomMinutes() {
    const value = window.prompt("Wpisz czas minutnika w minutach:", String(state.customMinutes));
    if (value === null) return;

    const minutes = Number(String(value).replace(",", "."));
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 180) return;

    state.customMinutes = Math.round(minutes * 10) / 10;
    const label = state.customMinutes % 1 === 0 ? `${state.customMinutes} min` : `${String(state.customMinutes).replace(".", ",")} min`;
    const customValue = $("#customTimerValue");
    if (customValue) customValue.textContent = label;
    setTimerMinutes(state.customMinutes, true);
  }

  function tick(timestamp) {
    if (!state.running) return;

    if (state.lastTick === null) {
      state.lastTick = timestamp;
    }

    const delta = timestamp - state.lastTick;
    state.lastTick = timestamp;

    if (state.mode === "timer") {
      state.timerRemainingMs = Math.max(0, state.timerRemainingMs - delta);
      if (state.timerRemainingMs <= 0) {
        state.running = false;
        state.lastTick = null;
        playAlarm();
        render();
        return;
      }
    } else {
      state.stopwatchElapsedMs += delta;
    }

    render();
    state.rafId = requestAnimationFrame(tick);
  }

  function start() {
    unlockAudio();
    if (state.running) return;

    if (state.mode === "timer" && state.timerRemainingMs <= 0) {
      state.timerRemainingMs = state.timerDurationMs;
    }

    state.running = true;
    state.lastTick = null;
    state.rafId = requestAnimationFrame(tick);
  }

  function pause() {
    state.running = false;
    state.lastTick = null;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    render();
  }

  function reset() {
    state.running = false;
    state.lastTick = null;
    if (state.rafId) cancelAnimationFrame(state.rafId);

    if (state.mode === "timer") {
      state.timerRemainingMs = state.timerDurationMs;
    } else {
      state.stopwatchElapsedMs = 0;
    }

    render();
  }

  function bindEvents() {
    $$(".preset-button").forEach((button) => {
      button.addEventListener("click", () => {
        unlockAudio();
        setTimerMinutes(Number(button.dataset.minutes), false);
      });
    });

    $$(".mode-button").forEach((button) => {
      button.addEventListener("click", () => {
        unlockAudio();
        setMode(button.dataset.mode);
      });
    });

    $("#customTimerButton")?.addEventListener("click", () => {
      unlockAudio();
      promptCustomMinutes();
    });

    $("#timerStart")?.addEventListener("click", start);
    $("#timerPause")?.addEventListener("click", pause);
    $("#timerReset")?.addEventListener("click", reset);
  }

  function initTimer() {
    bindEvents();
    setTimerMinutes(5, false);
    setMode("timer");
    render();
  }

  window.PixelBoardTimer = { initTimer };
})();

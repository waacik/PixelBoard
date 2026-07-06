(function () {
  const config = window.PIXELBOARD_CONFIG;
  const timeEl = document.getElementById("time");
  const weekdayEl = document.getElementById("weekday");
  const dateEl = document.getElementById("date");

  function updateClock() {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString(config.language, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !config.use24HourClock
    });
    weekdayEl.textContent = now.toLocaleDateString(config.language, { weekday: "long" });
    dateEl.textContent = now.toLocaleDateString(config.language, {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const hour = now.getHours();
    document.body.dataset.daypart = hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "day" : hour < 22 ? "evening" : "night";
  }

  window.PixelBoardClock = { updateClock };
})();

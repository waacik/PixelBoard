(function () {
  let weatherRefreshTimer = null;
  let isWeatherLoading = false;

  async function refreshWeather() {
    if (isWeatherLoading || !window.PixelBoardWeather?.loadWeather) return;

    try {
      isWeatherLoading = true;
      await window.PixelBoardWeather.loadWeather();
    } finally {
      isWeatherLoading = false;
    }
  }

  function startWeatherAutoRefresh() {
    refreshWeather();

    if (weatherRefreshTimer) {
      clearInterval(weatherRefreshTimer);
    }

    weatherRefreshTimer = setInterval(
      refreshWeather,
      window.PIXELBOARD_CONFIG.refreshMinutes * 60 * 1000
    );
  }

  function start() {
    window.PixelBoardClock.updateClock();
    setInterval(window.PixelBoardClock.updateClock, 1000);

    window.PixelBoardTimer?.initTimer();
    startWeatherAutoRefresh();

    window.addEventListener("online", refreshWeather);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshWeather();
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(console.warn);
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();

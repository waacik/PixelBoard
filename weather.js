(function () {
  const config = window.PIXELBOARD_CONFIG;

  const weatherCodeMap = {
    0: ["Bezchmurnie", "sun"],
    1: ["Przeważnie słonecznie", "sun"],
    2: ["Częściowe zachmurzenie", "partly"],
    3: ["Pochmurnie", "cloud"],
    45: ["Mgła", "fog"],
    48: ["Mgła osadzająca szadź", "fog"],
    51: ["Lekka mżawka", "rain"],
    53: ["Mżawka", "rain"],
    55: ["Gęsta mżawka", "rain"],
    61: ["Lekki deszcz", "rain"],
    63: ["Deszcz", "rain"],
    65: ["Mocny deszcz", "rain"],
    71: ["Lekki śnieg", "snow"],
    73: ["Śnieg", "snow"],
    75: ["Mocny śnieg", "snow"],
    80: ["Przelotny deszcz", "rain"],
    81: ["Przelotny deszcz", "rain"],
    82: ["Ulewa", "rain"],
    95: ["Burza", "storm"],
    96: ["Burza z gradem", "storm"],
    99: ["Silna burza z gradem", "storm"]
  };

  function weatherInfo(code) {
    return weatherCodeMap[code] || ["Pogoda", "partly"];
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setIcon(type) {
    const icon = document.getElementById("weatherIcon");
    if (!icon) return;

    const templates = {
      sun: '<span class="sun-core"></span>',
      partly: '<span class="sun-core"></span><span class="cloud cloud-main"></span><span class="cloud cloud-back"></span>',
      cloud: '<span class="cloud cloud-main"></span><span class="cloud cloud-back"></span>',
      rain: '<span class="cloud cloud-main"></span><span class="cloud cloud-back"></span><span class="drop d1"></span><span class="drop d2"></span><span class="drop d3"></span>',
      snow: '<span class="cloud cloud-main"></span><span class="cloud cloud-back"></span><span class="flake f1">✦</span><span class="flake f2">✦</span>',
      storm: '<span class="cloud cloud-main"></span><span class="cloud cloud-back"></span><span class="bolt">⌁</span>',
      fog: '<span class="fog-line"></span><span class="fog-line small"></span><span class="fog-line"></span>'
    };

    icon.className = `weather-icon ${type}`;
    icon.innerHTML = templates[type] || templates.partly;
  }

  function dayName(dateString) {
    return new Date(dateString + "T12:00:00").toLocaleDateString(config.language, { weekday: "short" });
  }

  function currentPrecipitationProbability(data) {
    const fallback = data?.daily?.precipitation_probability_max?.[0] ?? 0;
    const hourlyTimes = data?.hourly?.time || [];
    const hourlyProbability = data?.hourly?.precipitation_probability || [];
    const currentTime = data?.current?.time;

    if (!currentTime || hourlyTimes.length === 0 || hourlyProbability.length === 0) return fallback;

    const exactIndex = hourlyTimes.indexOf(currentTime.slice(0, 13) + ":00");
    if (exactIndex >= 0) return hourlyProbability[exactIndex] ?? fallback;

    const currentMs = new Date(currentTime).getTime();
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    hourlyTimes.forEach((time, index) => {
      const distance = Math.abs(new Date(time).getTime() - currentMs);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return hourlyProbability[bestIndex] ?? fallback;
  }

  async function loadWeather() {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: config.latitude,
      longitude: config.longitude,
      current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
      hourly: "precipitation_probability",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      forecast_days: String(config.forecastDays || 8)
    });

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Weather API error");

      const data = await response.json();
      const [description, iconType] = weatherInfo(data.current.weather_code);
      const temperature = Math.round(data.current.temperature_2m);
      const feelsLike = Math.round(data.current.apparent_temperature);
      const rainProbability = Math.round(currentPrecipitationProbability(data));
      const wind = Math.round(data.current.wind_speed_10m);
      const updateTime = new Date().toLocaleTimeString(config.language, { hour: "2-digit", minute: "2-digit" });

      setText("location", `${config.city}, ${config.country}`);
      setText("temperature", `${temperature}°`);
      setText("description", description);
      setText("rain", `${rainProbability}%`);
      setText("wind", `${wind} km/h`);
      setText("feels", `${feelsLike}°`);
      setText("feelsInline", `${feelsLike}°`);
      setText("updated", `Aktualizacja ${updateTime}`);

      setIcon(iconType);
      document.body.dataset.weather = iconType;

      const forecast = document.getElementById("forecast");
      const visibleDays = Math.min(config.forecastVisibleDays || 7, (data.daily.time.length || 1) - 1);
      forecast.innerHTML = data.daily.time.slice(1, visibleDays + 1).map((date, index) => {
        const i = index + 1;
        const [, rowIcon] = weatherInfo(data.daily.weather_code[i]);
        return `<div class="forecast-row">
          <span class="forecast-day">${dayName(date)}</span>
          <span class="mini-icon ${rowIcon}" aria-hidden="true"></span>
          <span class="forecast-temp">${Math.round(data.daily.temperature_2m_max[i])}° / ${Math.round(data.daily.temperature_2m_min[i])}°</span>
          <span class="forecast-rain">${Math.round(data.daily.precipitation_probability_max[i] || 0)}%</span>
        </div>`;
      }).join("");
    } catch (error) {
      setText("description", "Brak połączenia z pogodą");
      setText("updated", "Offline");
      console.error(error);
    }
  }

  window.PixelBoardWeather = { loadWeather };
})();

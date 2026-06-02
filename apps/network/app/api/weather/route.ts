import { NextRequest, NextResponse } from "next/server";

// Open-Meteo — free, no API key required
// Docs: https://open-meteo.com/en/docs

interface WeatherData {
  temp: number;
  humidity: number;
  condition: string;
  rain_chance: number;
  wind: number;
  city: string;
  country: string;
  icon: string;
}

// WMO weather code → human-readable condition
function wmoToCondition(code: number): { label: string; icon: string } {
  if (code === 0)             return { label: "Clear Sky",        icon: "☀️" };
  if (code <= 2)              return { label: "Mostly Clear",      icon: "🌤️" };
  if (code === 3)             return { label: "Overcast",          icon: "☁️" };
  if (code <= 49)             return { label: "Partly Cloudy",     icon: "⛅" };
  if (code <= 67)             return { label: "Rain",              icon: "🌧️" };
  if (code <= 77)             return { label: "Snow",              icon: "❄️" };
  if (code <= 82)             return { label: "Showers",           icon: "🌦️" };
  if (code <= 99)             return { label: "Thunderstorm",      icon: "⛈️" };
  return { label: "Partly Cloudy", icon: "⛅" };
}

// City → lat/lon lookup (common cities)
const CITY_COORDS: Record<string, { lat: number; lon: number; name: string; country: string }> = {
  accra:      { lat: 5.6037,   lon: -0.1870,  name: "Accra",       country: "GH" },
  kumasi:     { lat: 6.6885,   lon: -1.6244,  name: "Kumasi",      country: "GH" },
  tamale:     { lat: 9.4075,   lon: -0.8533,  name: "Tamale",      country: "GH" },
  lagos:      { lat: 6.5244,   lon: 3.3792,   name: "Lagos",       country: "NG" },
  abuja:      { lat: 9.0765,   lon: 7.3986,   name: "Abuja",       country: "NG" },
  nairobi:    { lat: -1.2921,  lon: 36.8219,  name: "Nairobi",     country: "KE" },
  kampala:    { lat: 0.3476,   lon: 32.5825,  name: "Kampala",     country: "UG" },
  dares:      { lat: -6.7924,  lon: 39.2083,  name: "Dar es Salaam",country: "TZ"},
  kigali:     { lat: -1.9706,  lon: 30.1044,  name: "Kigali",      country: "RW" },
  addis:      { lat: 9.0330,   lon: 38.7490,  name: "Addis Ababa", country: "ET" },
  johannesburg:{ lat:-26.2041, lon: 28.0473,  name: "Johannesburg",country: "ZA" },
};

export async function GET(req: NextRequest) {
  const cityParam = (req.nextUrl.searchParams.get("city") ?? "accra").toLowerCase();
  const latParam  = req.nextUrl.searchParams.get("lat");
  const lonParam  = req.nextUrl.searchParams.get("lon");

  let lat: number, lon: number, cityName: string, countryCode: string;

  if (latParam && lonParam) {
    lat = parseFloat(latParam);
    lon = parseFloat(lonParam);
    cityName = "Your Location";
    countryCode = "";
  } else {
    const coords = CITY_COORDS[cityParam] ?? CITY_COORDS.accra!;
    lat = coords.lat;
    lon = coords.lon;
    cityName = coords.name;
    countryCode = coords.country;
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude",          String(lat));
    url.searchParams.set("longitude",         String(lon));
    url.searchParams.set("current",           "temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code");
    url.searchParams.set("wind_speed_unit",   "kmh");
    url.searchParams.set("temperature_unit",  "celsius");
    url.searchParams.set("forecast_days",     "1");

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } }); // cache 30 min
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
    const data = await res.json();

    const current = data.current;
    if (!current) throw new Error("No current weather data");

    const weatherCode = current.weather_code as number ?? 1;
    const { label, icon } = wmoToCondition(weatherCode);

    const weather: WeatherData = {
      temp:         Math.round(current.temperature_2m as number ?? 28),
      humidity:     Math.round(current.relative_humidity_2m as number ?? 65),
      condition:    label,
      rain_chance:  Math.round(current.precipitation_probability as number ?? 20),
      wind:         Math.round(current.wind_speed_10m as number ?? 10),
      city:         cityName,
      country:      countryCode,
      icon,
    };

    return NextResponse.json(weather, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300",
      },
    });

  } catch {
    // Fallback to approximate regional weather
    return NextResponse.json({
      temp: 30, humidity: 68, condition: "Partly Cloudy",
      rain_chance: 25, wind: 12, city: cityName,
      country: countryCode, icon: "⛅",
    } satisfies WeatherData);
  }
}

import maplibregl from "maplibre-gl";
import "./style.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { findCurrywurstOpportunities, type CurrywurstStop } from "./wurst";
import currywurstImage from "./assets/currywurst.webp";
import { Temporal } from "temporal-polyfill";

const map = new maplibregl.Map({
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [8.2318, 46.7985],
  zoom: 6.7,
  container: "map-container",
});

const stationSpinner = document.getElementById("station-spinner")!;

const withStationSpinner = async (f: () => Promise<void>) => {
  stationSpinner.classList.remove("hidden");
  await f().finally(() => stationSpinner.classList.add("hidden"));
};

function e(tag: string, children: HTMLElement[] | string) {
  const elem = document.createElement(tag);
  if (Array.isArray(children)) {
    children.forEach((child) => elem.appendChild(child));
  }
  if (typeof children === "string") {
    elem.textContent = children;
  }
  return elem;
}

const renderStops = (stops: CurrywurstStop[]) => {
  const elem = document.getElementById("station-departures")!;

  elem.childNodes.forEach((child) => child.remove());

  stops.forEach((stop) => {
    const date = stop.departure.toZonedDateTimeISO("Europe/Zurich");

    const tr = e("tr", [
      e(
        "td",
        `${date.hour.toString().padStart(2, "0")}:${date.minute.toString().padStart(2, "0")}`,
      ),
      e("td", stop.station),
    ]);

    elem.appendChild(tr);
  });
};

const refreshData = async () => {
  await withStationSpinner(async () => {
    const currywurstStops = [];

    for await (const stop of findCurrywurstOpportunities()) {
      if (
        stop.departure.epochMilliseconds <
        Temporal.Now.instant().epochMilliseconds
      ) {
        continue;
      }

      currywurstStops.push(stop);

      const currywurstIconElem = document.createElement("img");
      currywurstIconElem.src = currywurstImage;
      currywurstIconElem.height = 48;
      new maplibregl.Marker({ element: currywurstIconElem })
        .setLngLat([stop.coordinate.y, stop.coordinate.x])
        .addTo(map);
    }

    currywurstStops.sort(
      (a, b) => a.departure.epochMilliseconds - b.departure.epochMilliseconds,
    );

    renderStops(currywurstStops);
  });
};

refreshData();

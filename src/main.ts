import maplibregl, { Popup } from "maplibre-gl";
import "./style.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { findCurrywurstOpportunities, type CurrywurstStop } from "./wurst";
import currywurstImage from "./assets/currywurst.webp";
import { Temporal } from "temporal-polyfill";
import { getConnections, getLocations } from "./transport";
import {
  getCurrentDateTime,
  hasOverride,
  setupDateSettings,
} from "./current-date";

const map = new maplibregl.Map({
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [8.2318, 46.7985],
  zoom: 6.7,
  container: "map-container",
});

const stationSpinner = document.getElementById("station-spinner")!;
const overrideWarning = document.getElementById("override-warning")!;

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

type WorldPosition = {
  latitude: number;
  longitude: number;
};

const getCurrentPositionCached = async (): Promise<WorldPosition> => {
  type PositionCache = { latitude: number; longitude: number; instant: string };
  const cacheEntry = localStorage.getItem("lastPosition");
  const cacheContent: null | PositionCache =
    cacheEntry && JSON.parse(cacheEntry);

  if (
    cacheContent &&
    Temporal.Instant.from(cacheContent.instant).add({ minutes: 5 })
      .epochMilliseconds > Temporal.Now.instant().epochMilliseconds
  ) {
    return cacheContent;
  }

  const { coords } = await new Promise<GeolocationPosition>((res, rej) =>
    navigator.geolocation.getCurrentPosition(res, rej),
  );

  localStorage.setItem(
    "lastPosition",
    JSON.stringify({
      longitude: coords.longitude,
      latitude: coords.latitude,
      instant: Temporal.Now.instant().toJSON(),
    } satisfies PositionCache),
  );

  return coords;
};

const getLocationStation = async (coords: WorldPosition) => {
  const { stations } = await getLocations({
    type: "station",
    x: coords.longitude.toString(),
    y: coords.latitude.toString(),
  });
  return stations.filter((station) => station.id).at(0);
};

const MINUTES_TO_SWITCH_TRAINS = 3;

const renderStops = (stops: CurrywurstStop[]) => {
  const elem = document.getElementById("station-departures")!;

  [...elem.children].forEach((child) => child.remove());

  stops.forEach((stop) => {
    const date = stop.departure.toZonedDateTimeISO("Europe/Zurich");

    const check = e("button", "Check Connection");

    check.addEventListener("click", async () => {
      check.setAttribute("disabled", "true");
      check.innerText = "Loading current position...";
      const coords = await getCurrentPositionCached();
      check.innerText = "Fetching station...";
      const station = await getLocationStation(coords);
      if (!station) {
        alert("Could not find a local station");
        return;
      }
      check.innerText = `Checking ${station.name}...`;

      const { connections } = await getConnections({
        from: station.name,
        to: stop.station,
        date: date.toPlainDate().toString(),
        // Ensure that we have 3 minutes left
        time: date
          .toPlainTime()
          .subtract({ minutes: MINUTES_TO_SWITCH_TRAINS })
          .toString(),
        isArrivalTime: "1",
      });

      const connection = connections
        // No past connections
        .filter(
          (connection) =>
            Temporal.Instant.from(connection.from.departure!)
              .epochMilliseconds >
            getCurrentDateTime().toInstant().epochMilliseconds,
        )
        // No connections that are too late
        .filter(
          (connection) =>
            Temporal.Instant.from(connection.to.arrival!).epochMilliseconds <=
            date.toInstant().subtract({ minutes: MINUTES_TO_SWITCH_TRAINS })
              .epochMilliseconds,
        )
        .at(-1);

      if (connection) {
        check.innerText = `${Temporal.Instant.from(connection.from.departure!).toZonedDateTimeISO("Europe/Zurich").toPlainTime().toString()} ${connection.from.station.name}`;
      } else {
        check.innerText = "No connection available";
      }
    });

    const tr = e("tr", [
      e("td", date.toPlainTime().toString()),
      e("td", stop.station),
      check,
    ]);

    elem.appendChild(tr);
  });
};

const refreshData = async () => {
  if (hasOverride()) {
    overrideWarning.classList.remove("hidden");
  } else {
    overrideWarning.classList.add("hidden");
  }

  await withStationSpinner(async () => {
    const currywurstStops = [];

    const stopsPerStation = new Map<string, CurrywurstStop[]>();

    for await (const stop of findCurrywurstOpportunities()) {
      if (
        stop.departure.epochMilliseconds <
        getCurrentDateTime().toInstant().epochMilliseconds
      ) {
        continue;
      }

      const station = stopsPerStation.get(stop.stationId);
      if (!station) {
        stopsPerStation.set(stop.stationId, [stop]);
      } else {
        station.push(stop);
      }

      currywurstStops.push(stop);
    }

    for (const [, stops] of stopsPerStation.entries()) {
      const stop = stops[0];

      const currywurstIconElem = document.createElement("img");
      currywurstIconElem.src = currywurstImage;
      currywurstIconElem.height = 48;
      new maplibregl.Marker({ element: currywurstIconElem })
        .setLngLat([stop.coordinate.y, stop.coordinate.x])
        .setPopup(
          new Popup().setHTML(
            `<div class="station-popup">
              <div>${stop.station}</div>
              <ul>
                ${stops
                  .map(
                    (stop) =>
                      `<li>${stop.departure.toZonedDateTimeISO("Europe/Zurich").toPlainTime()}</li>`,
                  )
                  .join("")}
              </ul>
            </div>`,
          ),
        )
        .addTo(map);
    }

    currywurstStops.sort(
      (a, b) => a.departure.epochMilliseconds - b.departure.epochMilliseconds,
    );

    renderStops(currywurstStops);
  });
};

const settingsForm = document.getElementById("settings-form")!;
const settingsDialog = document.getElementById("settings-dialog")!;

refreshData();
setupDateSettings(
  settingsForm as HTMLFormElement,
  settingsDialog as HTMLDialogElement,
  () => refreshData(),
);

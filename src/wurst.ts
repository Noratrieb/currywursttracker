import { getCurrentDateTime } from "./current-date";
import { getStationboard } from "./transport";
import { Temporal } from "temporal-polyfill";

const ICE_STARTS = ["Interlaken Ost", "Brig", "Zürich HB", "Chur", "Basel SBB"];

export type CurrywurstStop = {
  stationId: string;
  station: string;
  departure: Temporal.Instant;
  coordinate: { type: "WGS84"; x: number; y: number };
};

export async function* findCurrywurstOpportunities(): AsyncGenerator<CurrywurstStop> {
  const currentDate = getCurrentDateTime()
    .withTimeZone("Europe/Zurich")
    .toPlainDate();

  for (const baseStation of ICE_STARTS) {
    const result = await getStationboard({
      station: baseStation,
      limit: "200",
      transportations: "train",
      datetime: `${currentDate.toString()} 00:00`,
    });

    const ices = result.stationboard.filter((line) => line.category === "ICE");

    for (const ice of ices) {
      yield {
        stationId: ice.stop.station.id,
        station: ice.stop.station.name,
        departure: Temporal.Instant.from(ice.stop.departure!),
        coordinate: ice.stop.station.coordinate,
      };

      for (const pass of ice.passList) {
        if (!pass.station.name || !pass.departure) {
          continue;
        }
        yield {
          station: pass.station.name,
          stationId: pass.station.id,
          departure: Temporal.Instant.from(pass.departure),
          coordinate: pass.station.coordinate,
        };
      }
    }
  }
}

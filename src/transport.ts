export type Location = {
  id: string;
  name: string;
  coordinate: {
    type: "WGS84";
    x: number;
    y: number;
  };
};

export type Journey = {
  stop: Stop;
  name: string;
  category: string;
  number: string;
  operator: string;
  to: string;
  passList: Stop[];
};

export type Stop = {
  station: Location;
  arrival: string | null;
  departure: string | null;
  delay: number;
  platform: string;
  prognosis: Prognosis | undefined;
};

export type Prognosis = {
  arrival: string;
  departure: string;
};

export const getStationboard = async (query: {
  station: string;
  limit?: string;
  transportations?: "train" | "tram" | "ship" | "bus" | "cableway";
  /** Date and time of departing connections, in the format YYYY-MM-DD hh:mm. */
  datetime?: string;
}): Promise<{
  station: Location;
  stationboard: Journey[];
}> => {
  const res = await fetch(
    `https://transport.opendata.ch/v1/stationboard?${new URLSearchParams(query).toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );
  if (!res.ok) {
    throw new Error(
      `error getting stationboard (${res.status} ${res.statusText}): ${await res.text()}`,
    );
  }
  return res.json();
};

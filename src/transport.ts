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

export type Connection = {
  from: Stop;
  to: Stop;
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

export const getLocations = async (
  query: {
    type: "all" | "station" | "poi" | "address";
  } & (
    | { query: string }
    | {
        x: string;
        y: string;
      }
  ),
): Promise<{
  stations: Location[];
}> => {
  const res = await fetch(
    `https://transport.opendata.ch/v1/locations?${new URLSearchParams(query).toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );
  if (!res.ok) {
    throw new Error(
      `error getting locations (${res.status} ${res.statusText}): ${await res.text()}`,
    );
  }
  return res.json();
};

export const getConnections = async (query: {
  from: string;
  to: string;
  /** Date of the connection, in the format YYYY-MM-DD */
  date?: string;
  /** Time of the connection, in the format hh:mm */
  time?: string;
  isArrivalTime?: "0" | "1";
}): Promise<{
  connections: Connection[];
}> => {
  const res = await fetch(
    `https://transport.opendata.ch/v1/connections?${new URLSearchParams(query).toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );
  if (!res.ok) {
    throw new Error(
      `error getting connections (${res.status} ${res.statusText}): ${await res.text()}`,
    );
  }
  return res.json();
};

import { Temporal } from "temporal-polyfill";

const LOCALSTORAGE_KEY = "settings.datetime";

type SettingOverride = {
  date?: string | null;
  time?: string | null;
};

export const setupDateSettings = (
  settingsForm: HTMLFormElement,
  settingsDialog: HTMLDialogElement,
  updateSettingsCallback: () => void,
) => {
  settingsForm.addEventListener("submit", (ev) => {
    ev.preventDefault();

    const formData = Object.fromEntries(new FormData(settingsForm)) as {
      date: string;
      time: string;
    };

    const date = formData.date && Temporal.PlainDate.from(formData.date);
    const time = formData.time && Temporal.PlainTime.from(formData.time);

    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ date, time }));

    settingsDialog.close();
    updateSettingsCallback();
  });
};

const getOverride = () => {
  let override: SettingOverride;
  try {
    const storage = localStorage.getItem(LOCALSTORAGE_KEY);
    override = storage ? JSON.parse(storage) : {};
  } catch {
    localStorage.removeItem(LOCALSTORAGE_KEY);
    override = {};
  }
  return override;
};

export const hasOverride = (): boolean => {
  const override = getOverride();

  return !!override.date || !!override.time;
};

export const getCurrentDateTime = (): Temporal.ZonedDateTime => {
  const override = getOverride();

  let zonedDateTime = Temporal.Now.zonedDateTimeISO();
  if (override.date) {
    const date = Temporal.PlainDate.from(override.date);
    zonedDateTime = zonedDateTime.with({
      year: date.year,
      month: date.month,
      day: date.day,
    });
  }
  if (override.time) {
    const time = Temporal.PlainTime.from(override.time);
    zonedDateTime = zonedDateTime.withPlainTime(time);
  }

  return zonedDateTime;
};

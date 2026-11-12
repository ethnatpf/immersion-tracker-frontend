export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatUtcDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalTimeInputValue(date = new Date()) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${hour}:${minute}:${second}`;
}

export function isValidLocalDateInput(
  value: string,
  max = getLocalDateInputValue(),
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    value <= max
  );
}

export function dateInputToTimestamp(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}

export function dateTimeInputToTimestamp(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute, second = 0] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second).toISOString();
}

export function timestampToDateInput(value: string) {
  return getLocalDateInputValue(new Date(value));
}

export function timestampToTimeInput(value: string) {
  return getLocalTimeInputValue(new Date(value));
}

export function isValidLocalTimeInput(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

export function isValidLocalDateTimeInput(dateValue: string, timeValue: string) {
  if (
    !isValidLocalDateInput(dateValue, "9999-12-31") ||
    !isValidLocalTimeInput(timeValue)
  ) {
    return false;
  }
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute, second = 0] = timeValue.split(":").map(Number);
  const date = new Date(year, month - 1, day, hour, minute, second);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute &&
    date.getSeconds() === second
  );
}

export function isLocalDateTimeInPastOrPresent(
  dateValue: string,
  timeValue: string,
  now = new Date(),
) {
  if (!isValidLocalDateTimeInput(dateValue, timeValue)) return false;
  return (
    new Date(dateTimeInputToTimestamp(dateValue, timeValue)).getTime() <=
    now.getTime()
  );
}

export function formatUserDateTime(date: string, timeZone = getUserTimeZone()) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(date));
}

export function formatCompactUserDate(
  date: string,
  timeZone = getUserTimeZone(),
) {
  return new Intl.DateTimeFormat("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date(date));
}

export function formatCompactUtcDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

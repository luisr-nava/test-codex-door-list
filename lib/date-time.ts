const buenosAiresTimeZone = "America/Argentina/Buenos_Aires";

export function formatEventDateTime(
  value: string,
  dateStyle: "full" | "medium" = "full",
) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle,
    timeStyle: "short",
    timeZone: buenosAiresTimeZone,
  }).format(new Date(value));
}

export function toLocalDateTime(value: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

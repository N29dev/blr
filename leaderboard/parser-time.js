function toLocalInput(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 16) + "Z";
}

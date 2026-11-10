// Helpers for times, overlaps, sorting, and display formatting.

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Two sections clash if they share a day and their time ranges intersect.
// (Same rule as schedulesOverlap_ in the old Apps Script.)
export function sectionsOverlap(a, b) {
  const sharesDay = a.days.some((d) => b.days.includes(d));
  return (
    sharesDay &&
    toMinutes(a.start) < toMinutes(b.end) &&
    toMinutes(b.start) < toMinutes(a.end)
  );
}

// Earliest start first; ties broken by day, then section label.
export function sortSections(sections) {
  return [...sections].sort(
    (a, b) =>
      toMinutes(a.start) - toMinutes(b.start) ||
      DAY_ORDER.indexOf(a.days[0]) - DAY_ORDER.indexOf(b.days[0]) ||
      a.section.localeCompare(b.section, undefined, { numeric: true })
  );
}

function clock(hhmm) {
  const mins = toMinutes(hhmm);
  const hour24 = Math.floor(mins / 60);
  const minute = String(mins % 60).padStart(2, "0");
  return {
    text: `${hour24 % 12 === 0 ? 12 : hour24 % 12}:${minute}`,
    meridiem: hour24 >= 12 ? "PM" : "AM",
  };
}

// "08:00","09:30" -> "8:00–9:30 AM";  "11:00","12:30" -> "11:00 AM–12:30 PM"
export function formatTimeRange(start, end) {
  const a = clock(start);
  const b = clock(end);
  return a.meridiem === b.meridiem
    ? `${a.text}–${b.text} ${b.meridiem}`
    : `${a.text} ${a.meridiem}–${b.text} ${b.meridiem}`;
}

const KEEP_UPPER = new Set(["SJ", "II", "III", "IV", "TBA"]);

// "NAVARRO, ANDREI M." -> "Navarro, Andrei M."  (mixed-case names are left alone)
export function formatProf(name) {
  return name.replace(/[A-Za-z][A-Za-z'’]*/g, (word) => {
    if (KEEP_UPPER.has(word.toUpperCase())) return word.toUpperCase();
    if (word.length === 1 || word !== word.toUpperCase()) return word;
    return word[0] + word.slice(1).toLowerCase();
  });
}

export const formatProfs = (section) => section.profs.map(formatProf).join(" & ");

// "NSTP 12(CWTS)" -> "NSTP 12" (used on the small tabs)
export const shortCode = (code) => code.replace(/\(.*?\)/g, "").trim();
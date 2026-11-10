// Helpers for times, overlaps, sorting, and display formatting.
import { surnames } from "../data/courses";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
      DAYS.indexOf(a.days[0]) - DAYS.indexOf(b.days[0]) ||
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

// ---------- Weekly grid (8:00 AM to 9:00 PM in 30-minute rows) ----------

export const GRID_START = 8 * 60;
export const GRID_END = 21 * 60;
export const SLOT = 30;
export const SLOT_COUNT = (GRID_END - GRID_START) / SLOT;

// One pastel per subject (same family as the old sheet), assigned by curriculum position.
export const SUBJECT_COLORS = [
  "#cfe2f3", "#fff2cc", "#f4cccc", "#d9ead3",
  "#d9d2e9", "#ead1dc", "#fce5cd", "#d0e0e3",
];

// Where a section sits in the grid: first = 0-based row, span = number of rows.
export function gridRows(section) {
  const start = Math.max(toMinutes(section.start), GRID_START);
  const end = Math.min(toMinutes(section.end), GRID_END);
  const first = Math.floor((start - GRID_START) / SLOT);
  const last = Math.ceil((end - GRID_START) / SLOT);
  return { first, span: Math.max(last - first, 1) };
}

// Row labels like the sheet: 8:00, 8:30, ... 12:00, 12:30, 1:00 (no AM/PM)
export function slotLabel(index) {
  const mins = GRID_START + index * SLOT;
  const hour = Math.floor(mins / 60) % 12 || 12;
  return `${hour}:${String(mins % 60).padStart(2, "0")}`;
}

// The three lines shown inside a schedule block.
export function blockLines(subject, section) {
  return [`${subject.code} | ${section.section}`, section.room, surnames(section).join(" & ")];
}
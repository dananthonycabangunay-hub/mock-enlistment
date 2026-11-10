import {
  DAYS,
  SLOT_COUNT,
  blockLines,
  formatTimeRange,
  gridRows,
  slotLabel,
} from "./lib/schedule";

// Weekly grid: Mon to Sat across, 8:00 AM to 9:00 PM down in 30-minute rows.
export default function Schedule({ entries, onSelect }) {
  return (
    <div className="cal-scroll">
      <div
        className="cal"
        role="group"
        aria-label="Weekly schedule"
        style={{ gridTemplateRows: `2.25rem repeat(${SLOT_COUNT}, var(--row-h))` }}
      >
        {DAYS.map((day, i) => (
          <div key={day} className="cal-day" style={{ gridColumn: i + 2 }}>
            {day}
          </div>
        ))}

        {Array.from({ length: SLOT_COUNT }, (_, i) => (
          <div key={i} className="cal-time" style={{ gridRow: i + 2 }}>
            {slotLabel(i)}
          </div>
        ))}

        <div
          className="cal-lines"
          aria-hidden="true"
          style={{ gridRow: `2 / ${SLOT_COUNT + 2}` }}
        />

        {entries.flatMap(({ subject, section, color }) => {
          const { first, span } = gridRows(section);
          const lines = blockLines(subject, section);

          return section.days.map((day) => (
            <button
              key={`${section.id}-${day}`}
              type="button"
              className="cal-block"
              style={{
                gridColumn: DAYS.indexOf(day) + 2,
                gridRow: `${first + 2} / span ${span}`,
                background: color,
              }}
              aria-label={`${subject.code} section ${section.section}, ${day}, ${formatTimeRange(section.start, section.end)}, ${section.room}`}
              onClick={() => onSelect(subject.code)}
            >
              <span className="cal-code">{lines[0]}</span>
              <span>{lines[1]}</span>
              <span>{lines[2]}</span>
            </button>
          ));
        })}
      </div>
    </div>
  );
}

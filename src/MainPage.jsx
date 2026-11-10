import { useEffect, useMemo, useState } from "react";
import { surnames } from "./data/courses";
import { loadJSON, saveJSON } from "./lib/storage";
import {
  formatProfs,
  formatTimeRange,
  sectionsOverlap,
  shortCode,
  sortSections,
} from "./lib/schedule";

// Keep only saved picks that still exist in the data (in case sections change later).
function cleanPicks(saved, subjects) {
  const clean = {};
  if (!saved || typeof saved !== "object") return clean;
  for (const subject of subjects) {
    if (subject.fixed) continue;
    const id = saved[subject.code];
    if (subject.sections.some((s) => s.id === id)) clean[subject.code] = id;
  }
  return clean;
}

export default function MainPage({ program, onBack }) {
  const { subjects } = program;
  const storageKey = `mock-enlistment:v1:picks:${program.id}`;

  // Fixed subjects are always "picked" and never stored.
  const fixedPicks = useMemo(
    () =>
      Object.fromEntries(
        subjects
          .filter((s) => s.fixed && s.sections.length > 0)
          .map((s) => [s.code, s.sections[0].id])
      ),
    [subjects]
  );

  const [picks, setPicks] = useState(() =>
    cleanPicks(loadJSON(storageKey, {}).picks, subjects)
  );
  const [activeCode, setActiveCode] = useState(
    () => (subjects.find((s) => !s.fixed && s.sections.length > 0) ?? subjects[0]).code
  );

  useEffect(() => {
    saveJSON(storageKey, { picks });
  }, [storageKey, picks]);

  const allPicks = { ...picks, ...fixedPicks };

  // [{ subject, section }] for every subject that has a section picked.
  const chosen = subjects.flatMap((subject) => {
    const section = subject.sections.find((s) => s.id === allPicks[subject.code]);
    return section ? [{ subject, section }] : [];
  });

  const enrollable = subjects.filter((s) => s.sections.length > 0);
  const filledCount = enrollable.filter((s) => allPicks[s.code]).length;
  const totalUnits = chosen.reduce((sum, c) => sum + c.subject.units, 0);

  const active = subjects.find((s) => s.code === activeCode);

  // Open sections first, then the ones that overlap a pick from another subject.
  const rows = useMemo(() => {
    const others = chosen.filter((c) => c.subject.code !== active.code);
    const all = sortSections(active.sections).map((section) => {
      const clash = others.find((c) => sectionsOverlap(section, c.section));
      return {
        section,
        clash: clash ? `${shortCode(clash.subject.code)} ${clash.section.section}` : null,
      };
    });
    return [...all.filter((r) => !r.clash), ...all.filter((r) => r.clash)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, picks]);

  const togglePick = (subjectCode, sectionId) => {
    setPicks((prev) => {
      const next = { ...prev };
      if (next[subjectCode] === sectionId) delete next[subjectCode];
      else next[subjectCode] = sectionId;
      return next;
    });
  };

  return (
    <main className="main-page">
      {/* ---------- Left: pick sections ---------- */}
      <section className="panel picker-panel" aria-label="Choose your sections">
        <header className="panel-head">
          <button type="button" className="back" onClick={onBack}>
            Back
          </button>
          <div>
            <h1 className="main-title">{program.name}</h1>
            <p className="main-term">{program.term}</p>
          </div>
        </header>

        <dl className="stats">
          <div>
            <dt>Units</dt>
            <dd>{totalUnits}</dd>
          </div>
          <div>
            <dt>Subjects</dt>
            <dd>
              {filledCount} of {enrollable.length}
            </dd>
          </div>
        </dl>

        <div className="tabs">
          {subjects.map((s) => {
            const filled = Boolean(allPicks[s.code]);
            const empty = s.sections.length === 0;
            const cls = ["tab", filled && "is-filled", empty && "is-empty"]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={s.code}
                type="button"
                className={cls}
                aria-current={s.code === activeCode}
                title={s.title}
                onClick={() => setActiveCode(s.code)}
              >
                <span>{shortCode(s.code)}</span>
                {filled && <CheckIcon />}
              </button>
            );
          })}
        </div>

        <p className="active-title">
          {active.title} ({active.units} {active.units === 1 ? "unit" : "units"})
        </p>

        {active.sections.length === 0 ? (
          <p className="empty-state">
            No slots for {active.code} yet. It won't hold up your schedule.
          </p>
        ) : (
          <ul className="section-list">
            {rows.map(({ section, clash }) => (
              <li key={section.id}>
                <SectionCard
                  subject={active}
                  section={section}
                  clash={clash}
                  isChosen={allPicks[active.code] === section.id}
                  onPick={() => togglePick(active.code, section.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- Right: schedule summary (grid comes in the next step) ---------- */}
      <section className="panel summary-panel" aria-label="Schedule summary">
        <h2 className="summary-title">Schedule summary</h2>
        <p className="summary-note">
          The weekly grid is coming next. For now, here are your picks.
        </p>

        <ul className="pick-list">
          {subjects.map((subject) => {
            const entry = chosen.find((c) => c.subject.code === subject.code);
            return (
              <li key={subject.code} className={entry ? "pick" : "pick is-open"}>
                <button
                  type="button"
                  className="pick-head"
                  onClick={() => setActiveCode(subject.code)}
                >
                  <span className="pick-code">{subject.code}</span>
                  <span className="pick-units">
                    {subject.units} {subject.units === 1 ? "unit" : "units"}
                  </span>
                </button>
                {entry ? (
                  <p className="pick-detail">
                    Section {entry.section.section}, {entry.section.days.join(" ")}{" "}
                    {formatTimeRange(entry.section.start, entry.section.end)}
                    <br />
                    {entry.section.room}, {surnames(entry.section).join(" & ")}
                  </p>
                ) : (
                  <p className="pick-detail">
                    {subject.sections.length > 0 ? "Not chosen yet" : "No slots yet"}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        {Object.keys(picks).length > 0 && (
          <button type="button" className="link-button" onClick={() => setPicks({})}>
            Clear my picks
          </button>
        )}
      </section>
    </main>
  );
}

function SectionCard({ subject, section, clash, isChosen, onPick }) {
  const isFixed = subject.fixed;
  const state = isFixed ? "is-fixed" : clash ? "is-conflict" : isChosen ? "is-chosen" : "";
  const badge = isFixed ? "Pre-assigned" : isChosen ? "Chosen" : null;

  const body = (
    <>
      <span className="card-main">
        <span className="card-prof">{formatProfs(section)}</span>
        <span className="card-line">
          {subject.code} – {section.section}
        </span>
        <span className="card-line">
          <span className="card-days">{section.days.join(", ")}</span>
          {formatTimeRange(section.start, section.end)}
        </span>
        <span className="card-line">{section.room}</span>
        {section.note && <span className="card-line">{section.note}</span>}
      </span>
      {badge && <span className="card-badge">{badge}</span>}
      {clash && <span className="card-clash">Overlaps with {clash}</span>}
    </>
  );

  const cls = `card ${state} ${badge ? "has-badge" : ""}`;

  if (isFixed) return <div className={cls}>{body}</div>;

  return (
    <button
      type="button"
      className={cls}
      disabled={Boolean(clash)}
      aria-pressed={isChosen}
      onClick={onPick}
    >
      {body}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

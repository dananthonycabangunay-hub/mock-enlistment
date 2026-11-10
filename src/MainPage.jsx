import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Schedule from "./Schedule";
import { loadJSON, saveJSON } from "./lib/storage";
import { saveScheduleImage } from "./lib/screenshot";
import {
  SUBJECT_COLORS,
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

// Saved tab order, minus subjects that no longer exist, plus any new ones at the end.
function cleanOrder(saved, subjects) {
  const codes = subjects.map((s) => s.code);
  const kept = Array.isArray(saved) ? saved.filter((c) => codes.includes(c)) : [];
  return [...kept, ...codes.filter((c) => !kept.includes(c))];
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
  const [order, setOrder] = useState(() =>
    cleanOrder(loadJSON(storageKey, {}).order, subjects)
  );
  const [activeCode, setActiveCode] = useState(
    () => (subjects.find((s) => !s.fixed && s.sections.length > 0) ?? subjects[0]).code
  );

  useEffect(() => {
    saveJSON(storageKey, { picks, order });
  }, [storageKey, picks, order]);

  const allPicks = { ...picks, ...fixedPicks };

  // [{ subject, section, color }] for every subject that has a section picked.
  // Colors follow the curriculum position, so they stay put when tabs are reordered.
  const chosen = subjects.flatMap((subject, i) => {
    const section = subject.sections.find((s) => s.id === allPicks[subject.code]);
    return section
      ? [{ subject, section, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }]
      : [];
  });

  const enrollable = subjects.filter((s) => s.sections.length > 0);
  const filledCount = enrollable.filter((s) => allPicks[s.code]).length;
  const complete = filledCount === enrollable.length;
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

  // Mouse drags after moving 6px (so plain clicks still select); touch needs a short press
  // so scrolling the page with a finger doesn't grab a tab.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

  const onDragEnd = ({ active: a, over }) => {
    if (over && a.id !== over.id) {
      setOrder((o) => arrayMove(o, o.indexOf(a.id), o.indexOf(over.id)));
    }
  };

  const saveImage = async () => {
    try {
      await saveScheduleImage({ program, entries: chosen, units: totalUnits });
    } catch {
      alert("Couldn't save the image. Please try again.");
    }
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

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="tabs">
              {order.map((code) => {
                const s = subjects.find((x) => x.code === code);
                return (
                  <SortableTab
                    key={code}
                    subject={s}
                    filled={Boolean(allPicks[code])}
                    empty={s.sections.length === 0}
                    isActive={code === activeCode}
                    onSelect={() => setActiveCode(code)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

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

      {/* ---------- Right: schedule summary ---------- */}
      <section className="panel summary-panel" aria-label="Schedule summary">
        <h2 className="summary-title">Schedule summary</h2>

        <Schedule entries={chosen} onSelect={setActiveCode} />

        <button
          type="button"
          className="shot-btn"
          disabled={!complete}
          title={complete ? undefined : "Choose a section for every subject first"}
          onClick={saveImage}
        >
          Take a screenshot of your schedule
        </button>

        {Object.keys(picks).length > 0 && (
          <button type="button" className="link-button" onClick={() => setPicks({})}>
            Clear my picks
          </button>
        )}
      </section>
    </main>
  );
}

function SortableTab({ subject, filled, empty, isActive, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: subject.code });

  const cls = ["tab", filled && "is-filled", empty && "is-empty", isDragging && "is-dragging"]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cls}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-current={isActive}
      title={subject.title}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <span>{shortCode(subject.code)}</span>
      {filled && <CheckIcon />}
    </button>
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

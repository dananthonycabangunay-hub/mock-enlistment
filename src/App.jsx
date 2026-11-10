import { useEffect, useRef, useState } from "react";
import { PROGRAMS } from "./data/courses";
import "./App.css";

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [programId, setProgramId] = useState(null);
  const program = PROGRAMS.find((p) => p.id === programId);

  if (screen === "main" && program) {
    return <MainPage program={program} onBack={() => setScreen("landing")} />;
  }

  return (
    <Landing
      selectedId={programId}
      onSelect={setProgramId}
      onEnlist={() => setScreen("main")}
    />
  );
}

function Landing({ selectedId, onSelect, onEnlist }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const selected = PROGRAMS.find((p) => p.id === selectedId);

  // Close the menu when clicking outside it or pressing Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (!pickerRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (id) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <main className="landing">
      <div className="landing-content">
        <h1 className="landing-title">Mock Enlistment!</h1>
        <p className="landing-term">3Y 2S</p>

        <div className="picker" ref={pickerRef}>
          <button
            type="button"
            className="picker-trigger"
            aria-expanded={open}
            aria-controls="course-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span>{selected ? selected.name : "Choose your course"}</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {open && (
            <ul className="picker-menu" id="course-menu">
              {PROGRAMS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="picker-option"
                    aria-current={p.id === selectedId}
                    onClick={() => choose(p.id)}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <button type="button" className="enlist" onClick={onEnlist}>
            Enlist now
          </button>
        )}
      </div>
    </main>
  );
}

// Temporary page: proves the course data loads. We replace this next.
function MainPage({ program, onBack }) {
  return (
    <main className="main-page">
      <header className="main-header">
        <button type="button" className="back" onClick={onBack}>
          Back
        </button>
        <div>
          <h1 className="main-title">{program.name}</h1>
          <p className="main-term">{program.term}</p>
        </div>
      </header>

      <p className="placeholder-note">
        Course data loaded. The section picker and schedule come next.
      </p>

      <ul className="subject-list">
        {program.subjects.map((s) => (
          <li key={s.code}>
            <span className="subject-code">{s.code}</span>
            <span className="subject-title">{s.title}</span>
            <span className="subject-meta">
              {s.fixed
                ? "Fixed"
                : s.sections.length > 0
                  ? `${s.sections.length} sections`
                  : "No slots yet"}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import { PROGRAMS } from "./data/courses";
import { loadJSON, saveJSON } from "./lib/storage";
import MainPage from "./MainPage";
import "./App.css";

const APP_KEY = "mock-enlistment:v1:app";

export default function App() {
  // Remember the screen and course so a refresh keeps you where you were.
  const [screen, setScreen] = useState(() => loadJSON(APP_KEY, {}).screen ?? "landing");
  const [programId, setProgramId] = useState(() => loadJSON(APP_KEY, {}).programId ?? null);
  const program = PROGRAMS.find((p) => p.id === programId);

  useEffect(() => {
    saveJSON(APP_KEY, { screen, programId });
  }, [screen, programId]);

  if (screen === "main" && program) {
    return (
      <MainPage
        key={program.id}
        program={program}
        onBack={() => setScreen("landing")}
      />
    );
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

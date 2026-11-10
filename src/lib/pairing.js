// Pair sections using the `requires` IDs in the course data.
const keyFor = (subject, section) => `${subject.code}\0${section.id}`;

export function makePairing(subjects) {
  const entries = subjects.flatMap((subject) =>
    subject.sections.map((section) => ({ subject, section }))
  );
  const required = entries.filter(({ section }) => section.requires);
  const targetCounts = new Map();
  for (const { section } of required) {
    targetCounts.set(section.requires, (targetCounts.get(section.requires) || 0) + 1);
  }

  const pairedCodes = new Set();
  const pairs = new Map();
  for (const source of required) {
    pairedCodes.add(source.subject.code);
    const targets = entries.filter(({ section }) => section.id === source.section.requires);
    targets.forEach(({ subject }) => pairedCodes.add(subject.code));
    if (targets.length !== 1 || targetCounts.get(source.section.requires) !== 1) continue;
    const target = targets[0];
    if (target.subject.code === source.subject.code || target.section.requires) continue;
    const members = [source, target];
    pairs.set(keyFor(source.subject, source.section), members);
    pairs.set(keyFor(target.subject, target.section), members);
  }
  return { pairedCodes, pairs };
}

export function selectionMembers(subject, section, pairing) {
  if (!pairing.pairedCodes.has(subject.code)) return [{ subject, section }];
  return pairing.pairs.get(keyFor(subject, section)) || null;
}

// Ignore the old picks for the subjects being replaced, but check both new members
// against all other picks and against each other.
export function selectionClash(members, chosen, overlaps) {
  const replacing = new Set(members.map(({ subject }) => subject.code));
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i];
    const conflict = chosen.find(
      (entry) => !replacing.has(entry.subject.code) && overlaps(member.section, entry.section)
    );
    if (conflict) return { member, conflict };
    const other = members.slice(i + 1).find((entry) => overlaps(member.section, entry.section));
    if (other) return { member, conflict: other };
  }
  return null;
}

export function normalizePicks(saved, subjects, pairing, overlaps) {
  const raw = saved && typeof saved === "object" ? saved : {};
  const clean = {};
  for (const subject of subjects) {
    if (!subject.fixed && subject.sections.some((section) => section.id === raw[subject.code])) {
      clean[subject.code] = raw[subject.code];
    }
  }

  const savedPairCodes = [...pairing.pairedCodes].filter((code) => raw[code] != null);
  if (!savedPairCodes.length) return clean;
  const first = subjects.find((subject) => subject.code === savedPairCodes[0]);
  const section = first?.sections.find((item) => item.id === raw[first.code]);
  const members = section && selectionMembers(first, section, pairing);
  const consistent = members && savedPairCodes.every((code) =>
    members.some(({ subject, section: item }) => subject.code === code && item.id === raw[code])
  );
  // Clear both first. Preserve unrelated choices even when old pair data is invalid.
  for (const code of pairing.pairedCodes) delete clean[code];
  if (!consistent) return clean;

  const chosen = subjects.flatMap((subject) => {
    const id = subject.fixed ? subject.sections[0]?.id : clean[subject.code];
    const item = subject.sections.find((option) => option.id === id);
    return item ? [{ subject, section: item }] : [];
  });
  if (!selectionClash(members, chosen, overlaps)) {
    for (const member of members) clean[member.subject.code] = member.section.id;
  }
  return clean;
}

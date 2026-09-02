const supportedRevisionLevels = ['P4', 'P5', 'P6'];

function normalizeSubject(value) {
  return String(value ?? '').trim().toLowerCase();
}

function assignmentRowRank(row) {
  if (String(row.status || '').trim() === 'Completed') return 3;
  if (Number(row.assigned ?? 0) === 1) return 2;
  return 1;
}

function uniqueRowsByNameAndSubject(rows) {
  return Array.from(rows.reduce((uniqueRows, row) => {
    const key = `${normalizeSubject(row.subject)}:${String(row.name || row.title || '').trim().toLowerCase()}`;
    const existingRow = uniqueRows.get(key);
    if (!existingRow || assignmentRowRank(row) >= assignmentRowRank(existingRow)) {
      uniqueRows.set(key, row);
    }
    return uniqueRows;
  }, new Map()).values());
}

function filterAssignmentRows(rows, subject) {
  return uniqueRowsByNameAndSubject(rows).filter(row => normalizeSubject(row.subject) === normalizeSubject(subject));
}

module.exports = {
  filterAssignmentRows,
  normalizeSubject,
  supportedRevisionLevels,
  uniqueRowsByNameAndSubject
};

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { filterAssignmentRows, supportedRevisionLevels } = require('./assignmentData');

test('prelim rows stay separated by subject', () => {
  const rows = [
    { id: 1, name: 'Science Paper 1', subject: 'Science' },
    { id: 2, name: 'Math Paper 1', subject: 'Mathematics' },
    { id: 3, name: 'English Paper 1', subject: 'English' }
  ];

  assert.deepEqual(filterAssignmentRows(rows, 'Science').map(row => row.name), ['Science Paper 1']);
  assert.deepEqual(filterAssignmentRows(rows, 'Mathematics').map(row => row.name), ['Math Paper 1']);
  assert.deepEqual(filterAssignmentRows(rows, 'English').map(row => row.name), ['English Paper 1']);
});

test('duplicate parent and child bank rows appear once', () => {
  const rows = [
    { id: 1, name: 'Science Paper 1', subject: 'Science' },
    { id: 9, name: 'Science Paper 1', subject: 'Science' }
  ];

  assert.equal(filterAssignmentRows(rows, 'Science').length, 1);
});

test('assigned duplicate wins over an unassigned parent copy', () => {
  const rows = [
    { id: 1, name: 'Science Paper 1', subject: 'Science', assigned: 0 },
    { id: 9, name: 'Science Paper 1', subject: 'Science', assigned: 1 }
  ];

  assert.equal(filterAssignmentRows(rows, 'Science')[0].assigned, 1);
});

test('completed duplicate wins over an active parent copy', () => {
  const rows = [
    { id: 1, name: 'Science Paper 1', subject: 'Science', assigned: 1, status: 'In Progress' },
    { id: 9, name: 'Science Paper 1', subject: 'Science', assigned: 1, status: 'Completed' }
  ];

  assert.equal(filterAssignmentRows(rows, 'Science')[0].status, 'Completed');
});

test('revision levels are restricted to P4, P5, and P6', () => {
  assert.deepEqual(supportedRevisionLevels, ['P4', 'P5', 'P6']);
});
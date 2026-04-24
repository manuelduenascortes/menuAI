import assert from 'node:assert/strict'
import test from 'node:test'
import tableSelection from './table-selection.cjs'

const {
  createSelectionState,
  reduceTableSelection,
  areAllTablesSelected,
} = tableSelection

test('enter-selection enables selection mode without preselecting tables', () => {
  const nextState = reduceTableSelection(createSelectionState(), {
    type: 'enter-selection',
  })

  assert.equal(nextState.selectionMode, true)
  assert.deepEqual(nextState.selectedTableIds, [])
})

test('toggle-select-all enables selection mode and selects every table', () => {
  const tableIds = ['mesa-1', 'mesa-2', 'mesa-3']

  const nextState = reduceTableSelection(createSelectionState(), {
    type: 'toggle-select-all',
    tableIds,
  })

  assert.equal(nextState.selectionMode, true)
  assert.deepEqual(nextState.selectedTableIds, tableIds)
  assert.equal(areAllTablesSelected(nextState.selectedTableIds, tableIds), true)
})

test('toggle-table adds and removes a table while selection mode is active', () => {
  const activeState = createSelectionState({ selectionMode: true, selectedTableIds: ['mesa-1'] })

  const withSecondTable = reduceTableSelection(activeState, {
    type: 'toggle-table',
    tableId: 'mesa-2',
  })
  const withoutSecondTable = reduceTableSelection(withSecondTable, {
    type: 'toggle-table',
    tableId: 'mesa-2',
  })

  assert.deepEqual(withSecondTable.selectedTableIds, ['mesa-1', 'mesa-2'])
  assert.deepEqual(withoutSecondTable.selectedTableIds, ['mesa-1'])
})

test('exit-selection clears selected tables', () => {
  const nextState = reduceTableSelection(
    createSelectionState({ selectionMode: true, selectedTableIds: ['mesa-1', 'mesa-2'] }),
    { type: 'exit-selection' }
  )

  assert.equal(nextState.selectionMode, false)
  assert.deepEqual(nextState.selectedTableIds, [])
})

test('sync-table-ids drops selections that no longer exist', () => {
  const nextState = reduceTableSelection(
    createSelectionState({ selectionMode: true, selectedTableIds: ['mesa-1', 'mesa-2'] }),
    { type: 'sync-table-ids', tableIds: ['mesa-2', 'mesa-3'] }
  )

  assert.equal(nextState.selectionMode, true)
  assert.deepEqual(nextState.selectedTableIds, ['mesa-2'])
})

function uniqueIds(ids = []) {
  return Array.from(new Set(ids))
}

function createSelectionState(initialState = {}) {
  return {
    selectionMode: Boolean(initialState.selectionMode),
    selectedTableIds: uniqueIds(initialState.selectedTableIds),
  }
}

function areAllTablesSelected(selectedTableIds = [], tableIds = []) {
  if (tableIds.length === 0) return false

  const selectedSet = new Set(selectedTableIds)
  return tableIds.every((tableId) => selectedSet.has(tableId))
}

function reduceTableSelection(state = createSelectionState(), action) {
  switch (action.type) {
    case 'enter-selection':
      return {
        ...state,
        selectionMode: true,
      }

    case 'exit-selection':
      return createSelectionState()

    case 'toggle-table': {
      if (!state.selectionMode) {
        return state
      }

      const nextSelectedIds = new Set(state.selectedTableIds)
      if (nextSelectedIds.has(action.tableId)) {
        nextSelectedIds.delete(action.tableId)
      } else {
        nextSelectedIds.add(action.tableId)
      }

      return {
        ...state,
        selectedTableIds: Array.from(nextSelectedIds),
      }
    }

    case 'toggle-select-all': {
      const tableIds = uniqueIds(action.tableIds)
      return {
        selectionMode: true,
        selectedTableIds: areAllTablesSelected(state.selectedTableIds, tableIds) ? [] : tableIds,
      }
    }

    case 'sync-table-ids': {
      const availableIds = new Set(uniqueIds(action.tableIds))
      const syncedSelectedIds = state.selectedTableIds.filter((tableId) => availableIds.has(tableId))

      return {
        selectionMode: state.selectionMode && availableIds.size > 0,
        selectedTableIds: syncedSelectedIds,
      }
    }

    default:
      return state
  }
}

module.exports = {
  areAllTablesSelected,
  createSelectionState,
  reduceTableSelection,
}

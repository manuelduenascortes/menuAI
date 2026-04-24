function toggleSingleAccordionItem(currentValue, nextValue) {
  return currentValue === nextValue ? null : nextValue
}

module.exports = {
  toggleSingleAccordionItem,
}

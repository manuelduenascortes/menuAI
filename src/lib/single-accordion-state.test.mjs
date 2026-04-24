import assert from 'node:assert/strict'
import test from 'node:test'
import * as singleAccordionState from './single-accordion-state.mjs'

const { toggleSingleAccordionItem } = singleAccordionState

test('opens a closed accordion item', () => {
  assert.equal(toggleSingleAccordionItem(null, 'faq-1'), 'faq-1')
})

test('closes the same accordion item when toggled again', () => {
  assert.equal(toggleSingleAccordionItem('faq-1', 'faq-1'), null)
})

test('switches to a different accordion item', () => {
  assert.equal(toggleSingleAccordionItem('faq-1', 'faq-2'), 'faq-2')
})

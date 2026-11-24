// The phone: two big buttons, A and B. Tap one to vote; tap the other to
// change your mind until the screen locks the answer.

import './style.css'
import { connect } from './socket.js'

const $ = (s) => document.querySelector(s)
const el = {
  step: $('#step'),
  question: $('#question'),
  a: $('#vote-a'),
  b: $('#vote-b'),
  answerA: $('#answer-a'),
  answerB: $('#answer-b'),
  status: $('#status'),
}

// the same id after a reload or reconnect, so the vote is kept
let id = localStorage.getItem('vote-id')
if (!id) {
  id = Math.random().toString(36).slice(2, 10)
  localStorage.setItem('vote-id', id)
}

let state = { phase: 'waiting' }
let mine = null

const socket = connect({ role: 'phone', id }, {
  close() {
    el.status.textContent = 'Reconnecting…'
  },
  message(msg) {
    if (msg.type !== 'state') return
    // a state sent before the screen got our tap shouldn't undo it
    const sameQuestion = msg.phase === 'asking' && state.phase === 'asking' && msg.index === state.index
    if (msg.mine || !sameQuestion) mine = msg.mine
    state = msg
    render()
  },
})

for (const button of [el.a, el.b]) {
  button.addEventListener('click', () => {
    if (state.phase !== 'asking') return
    mine = button.dataset.choice
    socket.send({ type: 'vote', choice: mine, index: state.index })
    navigator.vibrate?.(15)
    render()
  })
}

function render() {
  const { phase } = state
  const asking = phase === 'asking'
  const result = phase === 'result'

  document.body.dataset.phase = phase
  document.body.dataset.mine = mine ?? ''
  el.step.textContent = state.total ? `Question ${state.index + 1} / ${state.total}` : ''
  el.question.textContent = state.question ?? 'Waiting for the screen…'
  el.answerA.textContent = state.a ?? ''
  el.answerB.textContent = state.b ?? ''
  el.a.disabled = el.b.disabled = !asking
  el.a.classList.toggle('picked', mine === 'A')
  el.b.classList.toggle('picked', mine === 'B')
  el.a.classList.toggle('won', result && state.winner === 'A')
  el.b.classList.toggle('won', result && state.winner === 'B')

  let status = ''
  if (phase === 'waiting') status = 'Get ready…'
  else if (asking) status = mine ? 'Voted. Tap the other one to change' : 'Tap your answer'
  else if (result) {
    if (!mine) status = 'You didn’t vote this time'
    else if (!state.winner) status = 'It’s a tie'
    else status = mine === state.winner ? 'The room agreed with you' : 'The room went the other way'
  }
  el.status.textContent = status
}
render()

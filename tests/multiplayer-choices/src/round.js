// The question/answer loop.
//
//   waiting  nobody in front of the screen; the question waits
//   asking   the question is up, people walk to a side
//            → locks when everyone has picked a side and nobody moved for
//              HOLD seconds, or when ASK_TIME runs out
//   result   the votes are frozen and shown, then the next question

export const ASK_TIME = 20
export const HOLD = 3
export const READ_TIME = 6 // no early lock before this
export const RESULT_TIME = 5

export function createRound(questions) {
  const r = {
    phase: 'waiting',
    index: 0,
    elapsed: 0, // time the current question has been up (with people present)
    still: 0, // how long everyone has been on a side without changes
    phaseTime: 0,
    votes: null, // { A, B } frozen at lock
    lastKey: '',
    get question() {
      return questions[r.index]
    },
  }

  function next() {
    r.index = (r.index + 1) % questions.length
    r.phase = 'waiting'
    r.elapsed = 0
    r.still = 0
    r.votes = null
    r.lastKey = ''
  }

  function lock(tally) {
    r.phase = 'result'
    r.phaseTime = 0
    r.votes = { A: tally.A, B: tally.B }
  }

  // players: the players module
  function update(players, dt) {
    r.phaseTime += dt
    const tally = players.tally()

    if (r.phase === 'result') {
      if (r.phaseTime > RESULT_TIME) next()
      return
    }

    if (players.count === 0) {
      // everyone left: the question starts over for the next group
      r.phase = 'waiting'
      r.elapsed = 0
      r.still = 0
      return
    }

    if (r.phase === 'waiting') {
      r.phase = 'asking'
      r.phaseTime = 0
    }

    r.elapsed += dt

    // "settled": everyone is on a side, and the split hasn't changed
    const key = `${tally.A}|${tally.B}|${tally.none}`
    if (tally.none === 0 && key === r.lastKey) r.still += dt
    else r.still = 0
    r.lastKey = key

    // people are still standing where they voted last time: give them time
    // to read the new question before an early lock can happen
    if ((r.still >= HOLD && r.elapsed >= READ_TIME) || r.elapsed >= ASK_TIME) lock(tally)
  }

  return {
    state: r,
    update,
    // space: lock now with the live counts, or move on from a result
    skip(players) {
      if (r.phase === 'result') next()
      else lock(players.tally())
    },
    restart() {
      r.index = -1
      next()
    },
  }
}

import 'dotenv/config'
import { XrplClient } from 'xrpl-client'
import {
  hasLedger,
  flagLedgerAsFetched,
  getMinLastKnownLedger,
  persistBookChanges,
} from './database.mjs'

const client = new XrplClient((process.env.XRPL_NODES || '').split(',').map(n => n.trim()))

const parallel = process.env.PARALLEL || 20 // Fetch book changes for # ledgers at the same time
const backfill = process.env.BACKFILL || false // ...

let indexLedger = await getMinLastKnownLedger()
let currentLedger = null
let nodePubKey = ''

client.send({
  command: 'subscribe',
  streams: ['book_changes', 'ledger']
})

const persist = async book_changes => {
  if (book_changes?.changes && Array.isArray(book_changes.changes)) {
    // console.log(await query(`SELECT * FROM ledgers WHERE ledger = :ledger`, {ledger: book_changes.ledger_index}))
    if (await hasLedger(book_changes.ledger_index)) {
      // Ledger alredy persisted
      console.log('!! Skip [PERSISTING] for ledger, ledger already persisted', book_changes.ledger_index)
      return
    }

    const ledger_info = await client.send({command: 'ledger', ledger_index: Number(book_changes.ledger_index) })
    const ledger_close_time = ledger_info?.ledger?.close_time + 946684800

    if (book_changes.changes.length > 0) {
      // OK, store ledger
      console.log('   > Got book changes        @ ', book_changes.ledger_index, book_changes.changes.length)
      await persistBookChanges(book_changes.ledger_index, book_changes.changes, ledger_close_time)
    } else if (typeof book_changes?.ledger_hash === 'string' && book_changes?.ledger_time) {
      console.log('   > Got no book changes     @ ', book_changes.ledger_index)
      await flagLedgerAsFetched(book_changes.ledger_index, 0, ledger_close_time)
    } else {
      console.log('   > Got unexpected response @ ', book_changes.ledger_index, '!!!!!!!!!!!!!!!!!!!')
    }
  }
  return
}

client.on('message', message => {
  if (message?.changes && message?.type === 'bookChanges') {
    console.log('Persist notified book change(s)', message?.changes?.length)
    persist(message)
  }
})

client.on('state', state => {
  if (state?.server?.publicKey && state?.server?.publicKey !== nodePubKey) {
    console.log('Uplink', state?.server)
    nodePubKey = state?.server?.publicKey
  }
})

client.on('ledger', ledger => {
  const lastLedger = ledger.validated_ledgers.split(',').reverse()[0].split('-').reverse()[0]
  if (String(lastLedger || '').match(/^[0-9]+$/)) {
    currentLedger = lastLedger

    if (indexLedger === null) {
      indexLedger = currentLedger
    }
  }
  console.log({indexLedger, currentLedger})
})

console.log('Waiting for uplink to be ready...')
await client.ready()
console.log('Ready. Start listening/fetching.')

if (backfill) {
  while (indexLedger > 32570) {
    const called = await Promise.all(Array(parallel).fill(0).map((v, i) => indexLedger - i).map(async fetchLedgerIndex => {
      

      if (await hasLedger(fetchLedgerIndex)) {
        // Ledger alredy persisted
        console.log('!! Skip [FETCHING] ledger, ledger already persisted', fetchLedgerIndex)
        return
      }    

      console.log('Request book_changes for ledger', fetchLedgerIndex)
      const book_changes = await client.send({
        command: 'book_changes',
        ledger_index: Number(fetchLedgerIndex)
      })

      await persist(book_changes)

      return book_changes
    }))

    indexLedger -= called.length

    console.log('Next round of #ledgers', parallel)
  }
}
import 'dotenv/config'
import mysql from 'mysql'

const pool = mysql.createPool({
  connectionLimit: process.env.DB_CONNLIMIT || 10,
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'db',
  password: process.env.DB_PASS || 'db',
  database: process.env.DB_DATABASE || 'db',
  charset: 'utf8mb4',
  queryFormat(query, values) {
    if (!values) return query
    return query.replace(/\:(\w+)/g, ((txt, key) => {
      if (values.hasOwnProperty(key)) return this.escape(values[key])
      return txt
    }).bind(this))
  }
})

pool.on('connection', c => {
  console.log(`Database @ node ${process.env.DB_HOST} connected, thread # ${c.threadId}`)
})

const query = async (query, params) => {
  return new Promise((resolve, reject) => {
    pool.query(query || '', params || {}, (error, results) => {
      if (error) reject(error)
      resolve(results)
    })
  })
}

// Trigger initial pool connection
query('SELECT @@VERSION')

const hasLedger = async ledger => {
  const ledgerLine = await query(`SELECT * FROM ledgers WHERE ledger = :ledger`, {ledger})
  return Array.isArray(ledgerLine) && ledgerLine.length > 0
}

const flagLedgerAsFetched = async (ledger, bookchanges = null) => {
  query(`INSERT IGNORE INTO ledgers (ledger, bookchanges) VALUES (:ledger, :bookchanges)`, {ledger, bookchanges})
}

const getMinLastKnownLedger = async () => {
  const minLastKnownLedger = await query(`SELECT MIN(ledger) as _ FROM ledgers`)
  if (Array.isArray(minLastKnownLedger) && minLastKnownLedger.length === 1) {
    return minLastKnownLedger[0]._
  }
  return null
}

const persistBookChanges = (ledger, changes) => {
  let changeCount = 0
  // console.log('INSERT', changes)
  if (Array.isArray(changes)) {
    changes.forEach(change => {
      query(`
        INSERT INTO bookchanges
          (ledger, close, cur_a, cur_b, high, low, open, vol_a, vol_b)
        VALUES
          (:ledger, :close, :cur_a, :cur_b, :high, :low, :open, :vol_a, :vol_b)
      `, {ledger, ...(
        change.cur_a === 'XRP_drops'
          ? {
            ...change,
            cur_a: 'XRP',
            close: change.close / 1_000_000,
            high: change.high / 1_000_000,
            low: change.low / 1_000_000,
            open: change.open / 1_000_000,
            vol_a: change.vol_a / 1_000_000,
          }
          : change
      )})
      changeCount++
    })

    flagLedgerAsFetched(ledger, changes.length)
  }
}

export default query

export {
  query,
  hasLedger,
  flagLedgerAsFetched,
  getMinLastKnownLedger,
  persistBookChanges,
}

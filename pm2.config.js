module.exports = {
  apps: [{
    name: 'book_changes',
    script: 'index.mjs',
    watch: false,
    instances: 1,
    exec_mode: 'fork',
    ignore_watch: ["node_modules", "db", ".git"]
  }]
}

export default {
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    reporters: ['default'],
    outputFile: {
      json: './coverage/coverage.json',
      html: './coverage/index.html',
      text: './coverage/coverage.txt'
    },
    silent: true,
    watch: false
  },
  coverage: {
    reporter: ['text', 'json', 'html'],
    include: ['index.js', 'cli.js']
  }
}

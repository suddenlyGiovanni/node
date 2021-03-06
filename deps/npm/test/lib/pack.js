const t = require('tap')
const mockNpm = require('../fixtures/mock-npm')
const pacote = require('pacote')

const OUTPUT = []
const output = (...msg) => OUTPUT.push(msg)

const libnpmpack = async (spec, opts) => {
  if (!opts)
    throw new Error('expected options object')

  return ''
}
const mockPacote = {
  manifest: (spec) => {
    if (spec.type === 'directory')
      return pacote.manifest(spec)
    const m = {
      name: spec.name || 'test-package',
      version: spec.version || '1.0.0-test',
    }
    m._id = `${m.name}@${m.version}`
    return m
  },
}

t.afterEach(() => OUTPUT.length = 0)

t.test('should pack current directory with no arguments', (t) => {
  const Pack = t.mock('../../lib/pack.js', {
    libnpmpack,
    npmlog: {
      notice: () => {},
      showProgress: () => {},
      clearProgress: () => {},
    },
  })
  const npm = mockNpm({
    config: {
      unicode: false,
      json: false,
      'dry-run': false,
    },
    output,
  })
  const pack = new Pack(npm)

  pack.exec([], err => {
    t.error(err, { bail: true })

    const filename = `npm-${require('../../package.json').version}.tgz`
    t.strictSame(OUTPUT, [[filename]])
    t.end()
  })
})

t.test('should pack given directory', (t) => {
  const testDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-cool-pkg',
      version: '1.0.0',
    }, null, 2),
  })

  const Pack = t.mock('../../lib/pack.js', {
    libnpmpack,
    npmlog: {
      notice: () => {},
      showProgress: () => {},
      clearProgress: () => {},
    },
  })
  const npm = mockNpm({
    config: {
      unicode: true,
      json: true,
      'dry-run': true,
    },
    output,
  })
  const pack = new Pack(npm)

  pack.exec([testDir], err => {
    t.error(err, { bail: true })

    const filename = 'my-cool-pkg-1.0.0.tgz'
    t.strictSame(OUTPUT, [[filename]])
    t.end()
  })
})

t.test('should pack given directory for scoped package', (t) => {
  const testDir = t.testdir({
    'package.json': JSON.stringify({
      name: '@cool/my-pkg',
      version: '1.0.0',
    }, null, 2),
  })

  const Pack = t.mock('../../lib/pack.js', {
    libnpmpack,
    npmlog: {
      notice: () => {},
      showProgress: () => {},
      clearProgress: () => {},
    },
  })
  const npm = mockNpm({
    config: {
      unicode: true,
      json: true,
      'dry-run': true,
    },
    output,
  })
  const pack = new Pack(npm)

  return pack.exec([testDir], err => {
    t.error(err, { bail: true })

    const filename = 'cool-my-pkg-1.0.0.tgz'
    t.strictSame(OUTPUT, [[filename]])
    t.end()
  })
})

t.test('should log pack contents', (t) => {
  const Pack = t.mock('../../lib/pack.js', {
    '../../lib/utils/tar.js': {
      ...require('../../lib/utils/tar.js'),
      logTar: () => {
        t.ok(true, 'logTar is called')
      },
    },
    libnpmpack,
    npmlog: {
      notice: () => {},
      showProgress: () => {},
      clearProgress: () => {},
    },
  })
  const npm = mockNpm({
    config: {
      unicode: false,
      json: false,
      'dry-run': false,
    },
    output,
  })
  const pack = new Pack(npm)

  pack.exec([], err => {
    t.error(err, { bail: true })

    const filename = `npm-${require('../../package.json').version}.tgz`
    t.strictSame(OUTPUT, [[filename]])
    t.end()
  })
})

t.test('invalid packument', (t) => {
  const mockPacote = {
    manifest: () => {
      return {}
    },
  }
  const Pack = t.mock('../../lib/pack.js', {
    libnpmpack,
    pacote: mockPacote,
    npmlog: {
      notice: () => {},
      showProgress: () => {},
      clearProgress: () => {},
    },
  })
  const npm = mockNpm({
    config: {
      unicode: true,
      json: true,
      'dry-run': true,
    },
    output,
  })
  const pack = new Pack(npm)
  pack.exec([], err => {
    t.match(err, { message: 'Invalid package, must have name and version' })

    t.strictSame(OUTPUT, [])
    t.end()
  })
})

t.test('workspaces', (t) => {
  const testDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'workspaces-test',
      version: '1.0.0',
      workspaces: ['workspace-a', 'workspace-b'],
    }, null, 2),
    'workspace-a': {
      'package.json': JSON.stringify({
        name: 'workspace-a',
        version: '1.0.0',
      }),
    },
    'workspace-b': {
      'package.json': JSON.stringify({
        name: 'workspace-b',
        version: '1.0.0',
      }),
    },
  })
  const Pack = t.mock('../../lib/pack.js', {
    libnpmpack,
    pacote: mockPacote,
    npmlog: {
      notice: () => {},
      showProgress: () => {},
      clearProgress: () => {},
    },
  })
  const npm = mockNpm({
    localPrefix: testDir,
    config: {
      unicode: false,
      json: false,
      'dry-run': false,
    },
    output,
  })
  const pack = new Pack(npm)

  t.test('all workspaces', (t) => {
    pack.execWorkspaces([], [], err => {
      t.error(err, { bail: true })

      t.strictSame(OUTPUT, [
        ['workspace-a-1.0.0.tgz'],
        ['workspace-b-1.0.0.tgz'],
      ])
      t.end()
    })
  })

  t.test('all workspaces, `.` first arg', (t) => {
    pack.execWorkspaces(['.'], [], err => {
      t.error(err, { bail: true })

      t.strictSame(OUTPUT, [
        ['workspace-a-1.0.0.tgz'],
        ['workspace-b-1.0.0.tgz'],
      ])
      t.end()
    })
  })

  t.test('one workspace', (t) => {
    pack.execWorkspaces([], ['workspace-a'], err => {
      t.error(err, { bail: true })

      t.strictSame(OUTPUT, [
        ['workspace-a-1.0.0.tgz'],
      ])
      t.end()
    })
  })

  t.test('specific package', (t) => {
    pack.execWorkspaces(['abbrev'], [], err => {
      t.error(err, { bail: true })

      t.strictSame(OUTPUT, [
        ['abbrev-1.0.0-test.tgz'],
      ])
      t.end()
    })
  })
  t.end()
})

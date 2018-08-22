import foo from '../src/foo'

describe('hello', () => {
  it('hello("jest") to be "Hello, Jest!"', () => {
    expect(foo.hello('Jest')).toBe('Hello, Jest!')
  })
})

module.exports = {
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!**/*.d.ts'],
}

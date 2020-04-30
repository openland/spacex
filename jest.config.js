module.exports = {
    globals: {
        'ts-jest': {
            tsConfig: './tsconfig.test.json',
        },
    },
    testEnvironment: 'jsdom',
    transform: {
        "^.+\\.tsx?$": "ts-jest"
    },
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json',
        'node'
    ],
    testRegex: '.*\\.spec\\.tsx?$',
    testPathIgnorePatterns: ['/node_modules/', '/build/', '/dist/', '/lib/'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'packages/**/*.{ts,tsx,js,jsx}',
        '!packages/**/*.d.ts',
        '!packages/**/lib/**/*',
    ],
    moduleDirectories: [
        '.',
        'packages',
        'node_modules'
    ],
    moduleNameMapper: {
        '^spacex$$': '<rootDir>/packages/spacex$/src'
    }
};

module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(ttf|otf|png|jpg)$': '<rootDir>/__mocks__/assetMock.js',
  },
  // These ship untranspiled ESM, which the preset otherwise skips.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|react-native-gifted-charts|gifted-charts-core|react-native-linear-gradient|@react-native-vector-icons)/)',
  ],
};

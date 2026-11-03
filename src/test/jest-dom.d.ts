import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Vitest 2 réexporte `Assertion` depuis @vitest/expect : on étend l'interface d'origine.
declare module '@vitest/expect' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
}

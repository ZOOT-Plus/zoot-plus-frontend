import snakeCaseKeys from 'snakecase-keys'

/**
 * Wrapper around `snakecase-keys` that prevents it from stripping out non-ASCII keys.
 *
 * Note: no need to do this for `camelcase-keys`, it works fine.
 */
export const snakeCaseKeysUnicode = ((input: any, options?: snakeCaseKeys.Options) => {
  // a regex that is supposed to match nothing, which prevents `snake-case` from
  // using its default regex to strip out non-word characters (including non ASCII characters)
  // see: https://github.com/blakeembrey/change-case/blob/040a079f007879cb0472ba4f7cc2e1d3185e90ba/packages/no-case/src/index.ts#L14
  const unmatchableRegex = /^\x00\x01/ // eslint-disable-line no-control-regex

  return snakeCaseKeys(input, {
    ...options,
    parsingOptions: {
      ...options?.parsingOptions,
      stripRegexp: unmatchableRegex,
    },
  })
}) as typeof snakeCaseKeys

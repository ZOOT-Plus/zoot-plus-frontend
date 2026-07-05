import { writeFile } from 'node:fs/promises'
import process from 'process'

import { getOperators } from './shared'

async function main() {
  console.info('Fetching operators...')
  const { operators, professions } = await getOperators()

  const formatted = JSON.stringify(
    {
      OPERATORS: operators,
      PROFESSIONS: professions,
    },
    null,
    2,
  )

  console.info('Writing to operators.json...')
  await writeFile('src/models/generated/operators.json', formatted)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

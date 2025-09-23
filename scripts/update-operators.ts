import { writeFile } from 'node:fs/promises'
import * as prettier from 'prettier'
import process from 'process'

import { fileExists, getOperators } from './shared'

const OPERATORS_JSON_PATH = 'src/models/generated/operators.json'

async function main() {
  const forceUpdate = process.argv.includes('--force') || process.env.ALLOW_OPERATORS_UPDATE === 'true'
  const operatorsJsonExists = await fileExists(OPERATORS_JSON_PATH)

  if (operatorsJsonExists && !forceUpdate) {
    console.info('检测到已存在的 operators.json，已跳过覆盖。')
    console.info('若需更新，请在命令后附加 --force 或设置环境变量 ALLOW_OPERATORS_UPDATE=true。')
    return
  }

  console.info('Fetching operators...')
  const { operators, professions } = await getOperators()

  const content = JSON.stringify({
    OPERATORS: operators,
    PROFESSIONS: professions,
  })

  const prettierConfig = await prettier.resolveConfig(process.cwd())
  console.log(prettierConfig)
  const formatted = await prettier.format(content, {
    ...prettierConfig,
    parser: 'json',
  })

  console.info('Writing to operators.json...')
  await writeFile(OPERATORS_JSON_PATH, formatted)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

import { mkdir, writeFile } from 'fs/promises'

import { fileExists, getOperators } from './shared'

const outDir = 'public/assets/prof-icons'

async function getProfIconsFromPrtsWiki() {
  console.info('fetching all sub-profession icons from prts wiki...')
  const baseUrl = `https://prts.wiki/api.php?action=query&format=json&list=allimages&continue=-%7C%7C&aiprefix=%E5%9B%BE%E6%A0%87_%E8%81%8C%E4%B8%9A_%E9%80%8F%E6%98%8E_`
  const resp = (await (await fetch(baseUrl)).json()) as any
  const results = resp.query.allimages

  console.info(`fetched ${results.length} sub-profession icons.`)

  return results
}

async function main() {
  console.info('update-prof-icons: launched')

  if (!(await fileExists(outDir))) {
    console.info(`creating directory ${outDir}...`)
    await mkdir(outDir)
  }

  const [{ professions }, files] = await Promise.all([getOperators(), getProfIconsFromPrtsWiki()])

  console.info('all metadata fetched.')

  for (const { id, name } of professions) {
    const url = files.find((el) => el.name === `图标_职业_透明_${name}.png`)?.url
    if (!url) {
      console.error(`${name}: cannot found icon`)
      continue
    }
    const expectFileAt = `${outDir}/${id}.png`
    if (await fileExists(expectFileAt)) {
      console.log(`${name}: already exists`)
      continue
    }
    console.log(`Downloading ${name} from ${url}...`)
    const resp = await fetch(url)
    if (!resp.ok) {
      console.error(`${name} failed to download`)
      continue
    }

    const buffer = await resp.arrayBuffer()
    await writeFile(expectFileAt, Buffer.from(buffer))
    console.info(`${name}: downloaded`)
  }
}

main()
  .then(() => {
    console.log('Done')
  })
  .catch((e) => {
    console.error(e)
  })
  .finally(() => {
    process.exit(0)
  })

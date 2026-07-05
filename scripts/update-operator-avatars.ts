import { mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

import { fileExists, getOperators } from './shared'

const avatarsDir = path.resolve(__dirname, '../public/assets/operator-avatars')

async function getAllAvatarsFromPrtsWiki() {
  console.info('fetching all avatars from prts wiki...')

  const baseUrl = `https://prts.wiki/api.php?action=query&list=allimages&aiprefix=头像&ailimit=500&format=json`
  const results: any[] = []

  let continueParams = new URLSearchParams()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = (await (await fetch(`${baseUrl}&${continueParams.toString()}`)).json()) as any
    results.push(...resp.query.allimages)

    if (resp.continue) {
      continueParams = new URLSearchParams(resp.continue)
    } else {
      break
    }

    console.info(`fetched ${results.length} avatars. fetching next page from ${continueParams.get('aicontinue')}...`)
  }

  console.info(`fetched ${results.length} avatars.`)

  return results
}

async function main() {
  console.info('update-operator-avatars: launched')

  const [{ operators }, files] = await Promise.all([getOperators(), getAllAvatarsFromPrtsWiki()])

  console.info('all metadata fetched.')

  for (const { id, name } of operators) {
    const withTokenName = id.startsWith('token_') ? `召唤物_${name}` : name
    const avatarUrl = files.find((el) => el.name === `头像_${withTokenName}.png`)?.url
    if (!avatarUrl) {
      console.error(`${id}: cannot found avatar file`)
      continue
    }

    let downloadPromise: Promise<ArrayBuffer> | undefined

    const download = () => {
      if (!downloadPromise) {
        console.log(`${id}: downloading from ${avatarUrl}`)
        downloadPromise = fetch(avatarUrl).then((resp) => {
          if (!resp.ok) {
            throw new Error(`${id}: failed to download avatar`)
          }
          return resp.arrayBuffer()
        })
      }
      return downloadPromise
    }

    const generateImage = async ({
      format,
      size,
      options,
    }: {
      size: number
      format: Parameters<sharp.Sharp['toFormat']>[0]
      options: Parameters<sharp.Sharp['toFormat']>[1]
    }) => {
      try {
        const outputDir = path.join(avatarsDir, `${format}${size}`)
        const outputPath = path.join(outputDir, `${id}.${format}`)

        if (await fileExists(outputPath)) {
          return
        }

        if (!(await fileExists(outputDir))) {
          await mkdir(outputDir, { recursive: true })
        }

        const buffer = await download()

        await sharp(buffer).resize(size, size).toFormat(format, options).toFile(outputPath)

        return
      } catch (e) {
        console.error(`${id}: failed to generate ${format} of size ${size}`, e)
        return
      }
    }

    await Promise.all([
      generateImage({
        format: 'webp',
        size: 32,
        options: { preset: 'icon', quality: 50 },
      }),
      generateImage({
        format: 'webp',
        size: 96,
        options: { preset: 'icon', quality: 80 },
      }),
    ])
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

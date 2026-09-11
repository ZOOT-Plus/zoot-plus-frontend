import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

import sharp from 'sharp'

import { fileExists, getOperators } from './shared'

const avatarsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/assets/operator-avatars')

type PrtsImage = { name: string; url: string }

const AVATAR_SIZES = [
  { size: 32, quality: 50 },
  { size: 96, quality: 80 },
]

const avatarDir = (size: number) => path.join(avatarsDir, `webp${size}`)

/** 文件名一般为「头像_<名称>.png」，部分干员带消歧后缀，如「头像_Mechanist(卫戍协议).png」 */
function findAvatarUrl(files: PrtsImage[], name: string) {
  const target = `头像_${name}`
  const exact = files.find((el) => el.name === `${target}.png`)
  const suffixed = files.find((el) => el.name.startsWith(`${target}(`) && el.name.endsWith(').png'))
  return (exact ?? suffixed)?.url
}

async function getAllAvatarsFromPrtsWiki() {
  console.log('fetching all avatars from prts wiki...')

  const baseUrl = `https://prts.wiki/api.php?action=query&list=allimages&aiprefix=头像&ailimit=500&format=json`
  const results: PrtsImage[] = []

  let continueParams: URLSearchParams | undefined
  do {
    const resp = (await (await fetch(`${baseUrl}&${continueParams ?? ''}`)).json()) as any
    results.push(...resp.query.allimages)
    continueParams = resp.continue ? new URLSearchParams(resp.continue) : undefined
    console.log(`fetched ${results.length} avatars.`)
  } while (continueParams)

  return results
}

async function main() {
  console.log('update-operator-avatars: launched')

  const [{ operators }, files] = await Promise.all([getOperators(), getAllAvatarsFromPrtsWiki()])
  await Promise.all(AVATAR_SIZES.map(({ size }) => mkdir(avatarDir(size), { recursive: true })))

  const missing: string[] = []
  const failed: string[] = []

  for (const { id, name } of operators) {
    const url = findAvatarUrl(files, id.startsWith('token_') ? `召唤物_${name}` : name)
    if (!url) {
      missing.push(`${id} (${name})`)
      continue
    }

    const pending: { output: string; size: number; quality: number }[] = []
    for (const { size, quality } of AVATAR_SIZES) {
      const output = path.join(avatarDir(size), `${id}.webp`)
      if (!(await fileExists(output))) pending.push({ output, size, quality })
    }
    if (pending.length === 0) continue

    try {
      console.log(`${id}: downloading from ${url}`)
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`failed to download avatar`)
      const buffer = await resp.arrayBuffer()

      await Promise.all(
        pending.map(({ output, size, quality }) =>
          sharp(buffer).resize(size, size).toFormat('webp', { preset: 'icon', quality }).toFile(output),
        ),
      )
    } catch (e) {
      console.error(`${id}: failed to update avatar`, e)
      failed.push(id)
    }
  }

  if (missing.length > 0) {
    // wiki 上暂时没有这些干员的头像，等 wiki 补档后会自动下载
    console.warn(`${missing.length} avatar(s) not found on prts wiki:\n${missing.join('\n')}`)
  }

  if (failed.length > 0) {
    throw new Error(`Failed to update ${failed.length} avatar image(s):\n${failed.join('\n')}`)
  }

  // 大面积缺失通常是 wiki 接口或命名规则变了，需要人工检查
  if (missing.length > operators.length * 0.1) {
    throw new Error(`Too many avatars missing on prts wiki (${missing.length}/${operators.length})`)
  }
}

main()
  .then(() => {
    console.log('Done')
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

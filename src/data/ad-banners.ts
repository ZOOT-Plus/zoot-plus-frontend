export interface AdBannerConfigItem {
  image: string
  link: string
  alt?: string
}

// 可在此数组中快速增删改广告项
export const defaultAdBanners: AdBannerConfigItem[] = [
  // {
  //   image: '/ad_leidian.webp',
  //   link: 'https://lddl01.ldmnq.com/downloader/ldplayerinst9.exe?n=LDplayer9_ld_406237_3586_ld.exe',
  //   alt: '雷电模拟器',
  // },
  {
    image: '/周年庆.png',
    link: 'https://pd.qq.com/s/hismsfiu8',
    alt: 'MaaYuan',
  },
]

import localFont from 'next/font/local';

/**
 * NotoSansJPフォント設定
 * 全9種類のフォントウェイト（100-900）をサポート
 */
export const notoSansJP = localFont({
  src: [
    {
      path: '../../../public/font/NotoSansJP-Thin.ttf',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../../../public/font/NotoSansJP-ExtraLight.ttf',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../../../public/font/NotoSansJP-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../../public/font/NotoSansJP-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../public/font/NotoSansJP-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../../public/font/NotoSansJP-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../../public/font/NotoSansJP-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../../public/font/NotoSansJP-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../../public/font/NotoSansJP-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

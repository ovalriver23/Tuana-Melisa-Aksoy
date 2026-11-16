# Portfolyo sitesi: kod planı

Bu belge, "Işıklı Kütüphane" demosunu gerçek ve bakımı kolay bir siteye dönüştürmenin planı. Demo tek dosyalık bir denemeydi (yaklaşık 1.050 satır, hepsi tek HTML içinde). Burada aynı deneyimi temiz bir mimariyle baştan kuruyoruz.

## 1. Ne yapıyoruz

**Demodan korunacak deneyim**

- Gece, taş duvar ve eski kapı. İmleç duvarı aydınlatan bir fener.
- Kaydırınca kapı açılır, oda kapı aralığından görünür, içeri girilir.
- Odada kâğıt notlar: hakkımda, deneyim, eğitim.
- Kitaplık öne gelir. Lamba tıklanınca zıplar ve ışığı oynatır. Kitaba tıklayınca proje açılır.

**Gerçek sitede eklenecekler**

- Gerçek içerik: proje metinleri, ekran görüntüleri, linkler.
- Çok dil desteği (hangi diller olacağı açık karar, bkz. bölüm 11).
- Erişilebilirlik: klavye, ekran okuyucu, "hareketi azalt" ayarı.
- Otomatik testler, CI ve her PR için önizleme linki.
- Arama motoru ve paylaşım bilgileri (başlık, açıklama, paylaşım görseli).

**İlk sürümde olmayacaklar:** blog, iletişim formu, içerik yönetim paneli. Gerekirse sonra eklenir, mimari buna engel değil.

## 2. Teknoloji seçimleri

| Konu | Seçim | Neden |
|---|---|---|
| Çatı | Next.js (App Router), React, TypeScript `strict` | Site tamamen statik üretilecek, sunucu kodu yok. |
| Stil | Tailwind CSS v4 (sayfa düzeni, yazı, düğmeler) ve CSS Modules (sahneler) | Sahnelerdeki gradyan, maske ve animasyonlar yardımcı sınıflarla okunmaz hâle gelir. Kural: sayfa düzeni Tailwind, çizim CSS Modules. |
| Animasyon | Kütüphane yok, kendi modüllerimiz | Kamera ve fizik kodu küçük ve saf fonksiyonlardan oluşuyor. Bağımlılık eklemeden test edilebilir kalıyor. |
| Çizim | Derleme anında üretilen SVG | Taşlar ve yapraklar sunucuda üretilip HTML'e gömülür. Tarayıcıda çizim için JavaScript çalışmaz. |
| Test | Vitest (saf mantık), Playwright (uçtan uca) | Matematik hızlı birim testleriyle, akış gerçek tarayıcıyla sınanır. |
| Kalite | ESLint, Prettier, GitHub Actions | Her PR'da lint, tip kontrolü, test ve build otomatik çalışır. |
| Yayın | Vercel | Her PR için önizleme linki, merge edince canlı. |

## 3. Mimarinin ana fikri

Kod üç katmana ayrılır ve bağımlılık tek yöne akar:

```
content  (ne söylüyoruz)        core  (nasıl hareket ediyor)
        \                        /
         ui  (nasıl görünüyor)
```

- **`content`** yalnızca veri ve tiplerdir: projeler, deneyim, metinler. Kod içermez.
- **`core`** saf TypeScript'tir: kamera matematiği, sarkaç, rastgele üretim. React'i, DOM'u ve `window`'u bilmez. Bu yüzden tarayıcı olmadan test edilir.
- **`ui`** React bileşenleridir. `content`'i gösterir, `core`'u kancalar (hooks) üzerinden kullanır.

`core` ve `content` birbirini ve `ui`'ı içe aktarmaz. Bu kural ESLint ile zorlanır, yanlış yönde import lint'i kırar.

**En önemli performans kuralı:** animasyon değerleri React state'ine girmez. Kancalar her karede hesaplanan değerleri `ref` üzerinden CSS değişkenlerine ve `transform`'a yazar. React sahneyi bir kez çizer, sonra yeniden render etmez.

## 4. Klasör yapısı

```
src/
  app/
    [locale]/
      layout.tsx          yazı tipleri, meta bilgileri, dil
      page.tsx            bölümleri sırayla dizen iskelet
    globals.css           Tailwind girişi ve tasarım belirteçleri (renk, yazı)
  content/
    types.ts              Project, Experience, Profile tipleri
    projects.ts           her kitap bir kayıt
    experience.ts
    profile.ts
    messages/             arayüz metinleri: tr.ts, en.ts, ...
  core/
    math.ts               clamp, lerp, smoothstep
    random.ts             tohumlu rastgele sayı üreteci
    camera/
      layout.ts           sahne ölçüleri: kapı boşluğu, kitaplığın odadaki yeri
      projection.ts       sahne birimi ile ekran pikseli arası dönüşüm
      progress.ts         kaydırma konumu -> { enter, approach }
      pose.ts             ilerleme + ekran ölçüsü -> kapı, oda, kitaplık dönüşümleri
    motion/
      glide.ts            bir değeri hedefine yumuşakça yaklaştırma
      pendulum.ts         lamba: sönümlü sarkaç ve zıplama
      lanternPath.ts      fener: imleç yokken izlediği yol
    generators/
      stoneWall.ts        taş duvar şekilleri
      foliage.ts          sarmaşık yaprakları
  ui/
    scene/
      SceneRoot.tsx       katman sırası; kamerayı katmanlara uygular
      door/               DoorWall, DoorLeaf, DoorLight, Foliage, Lantern
      room/               Room, RoomFire
      atmosphere/         Grain, Motes, Vignette
    bookcase/             Bookcase, Book, Lamp, BookDialog
    sections/             Hero, Notes, Note
    layout/               Nav
    hooks/
      useViewport.ts
      useScrollProgress.ts
      useFrameLoop.ts
      useCamera.ts
      usePointerLight.ts
      usePendulum.ts
      useReducedMotion.ts
tests/
  e2e/                    Playwright senaryoları
docs/
  ARCHITECTURE.md         bu belge
  DECISIONS.md            alınan kararlar ve nedenleri
```

Birim testleri sınadıkları dosyanın yanında durur: `pose.ts` ile `pose.test.ts` aynı klasörde.

## 5. Modüller ve sözleşmeleri

### Kamera (`core/camera`)

Sitenin kalbi. Demodaki `render()` fonksiyonunun yaptığı işi üç saf fonksiyona böler.

```ts
export interface Viewport { width: number; height: number }

/** İkisi de 0 ile 1 arasında. enter: kapalı kapıdan odaya. approach: odadan kitaplığın önüne. */
export interface Progress { enter: number; approach: number }

export interface Pose {
  door:     { x: number; y: number; scale: number; opacity: number; leafAngle: number };
  room:     { x: number; y: number; scale: number; dim: number };
  bookcase: { x: number; y: number; scale: number; interactive: boolean };
}

export function readProgress(scrollY: number, sections: SectionOffsets, viewport: Viewport): Progress;
export function computePose(progress: Progress, viewport: Viewport, bookcaseSize: Size): Pose;
```

`computePose` yalnızca sayı alır ve sayı döndürür. Ekrana uygulamak `useCamera` kancasının işidir.

### Hareket (`core/motion`)

- `glide(current, target, dt)`: kaydırma adımlarının sahneyi zıplatmaması için yumuşatma.
- `stepPendulum(state, dt)`: lambanın açısı, hızı ve zıplaması. Yeni durumu döndürür, eskisini değiştirmez.
- `lanternTarget(time, anchors)`: imleç hareketsizken fenerin gideceği nokta.

### Üreteçler (`core/generators`)

`generateStoneWall(seed, opening)` ve `generateFoliage(seed, regions)` şekil listesi döndürür. Aynı tohum her zaman aynı duvarı verir. Bileşenler bu listeyi SVG'ye çevirir. İleride elle çizilmiş görseller gelirse yalnızca `DoorWall` ve `Room` bileşenleri değişir, kamera koduna dokunulmaz.

### İçerik (`content`)

```ts
export interface Project {
  slug: string;
  title: string;
  spine: { label: string; color: string; shelf: 0 | 1 | 2 };
  role: LocalizedText;
  summary: LocalizedText;
  stack: string[];
  links: { label: LocalizedText; href: string }[];
  images: { src: string; alt: LocalizedText; caption: LocalizedText }[];
}
```

Yeni proje eklemek, `projects.ts` dosyasına bir kayıt eklemektir. Kitaplık rafları bu listeden kendiliğinden dizilir.

### Kancalar (`ui/hooks`)

Her kanca tek iş yapar ve `core` ile tarayıcı arasındaki ince köprüdür.

| Kanca | İşi |
|---|---|
| `useViewport` | Ekran ölçüsünü izler. |
| `useScrollProgress` | Kaydırmayı dinler, `readProgress` ile ilerlemeyi verir. |
| `useFrameLoop` | `requestAnimationFrame` döngüsünü yönetir, iş bitince durur. |
| `useCamera` | İlerlemeyi `glide` ile yumuşatır, `computePose` sonucunu katmanlara yazar. |
| `usePointerLight` | Feneri imlece ya da `lanternTarget` yoluna taşır. |
| `usePendulum` | Lambaya tıklanınca `stepPendulum`'u çalıştırır, ışık değişkenlerini günceller. |
| `useReducedMotion` | "Hareketi azalt" ayarını okur. |

## 6. SOLID bu projede ne anlama geliyor

- **Tek sorumluluk:** `pose.ts` yalnızca hesaplar, `useCamera` yalnızca uygular, `DoorWall` yalnızca çizer. Bir dosyayı değiştirmek için tek bir neden olur.
- **Açık/kapalı:** yeni proje bir veri kaydıdır, yeni sahne katmanı yeni bir bileşendir. İkisinde de mevcut kamera kodu değişmez.
- **Yerine geçebilirlik:** kodla çizilmiş `DoorWall` ile elle çizilmiş bir görseli kullanan `DoorWall` aynı prop'ları alır. Biri diğerinin yerine konunca hiçbir şey bozulmaz.
- **Arayüz ayrımı:** tek dev bir "animasyon" kancası yerine yedi küçük kanca var. Lamba bileşeni kaydırmayı bilmek zorunda değil.
- **Bağımlılığın tersine çevrilmesi:** `core` zamanı ve ekran ölçüsünü parametre olarak alır, `window`'dan okumaz. Testte sahte saat ve sahte ekran verilir.

## 7. Kod kuralları

- İsimler İngilizce. Yorumlar kodun ne yaptığını değil, neden öyle yaptığını anlatır.
- Sihirli sayı yok. Sahne ölçüleri `core/camera/layout.ts` içinde adlandırılmış sabitlerdir.
- `any` yok, TypeScript `strict` açık.
- Bir bileşen 150 satırı geçiyorsa bölünür.
- Commit mesajları kısa ve Conventional Commits biçiminde: `feat:`, `fix:`, `test:`, `docs:`.
- PR'lar küçük tutulur ve tek konuya odaklanır. CI yeşil olmadan merge edilmez.

## 8. Erişilebilirlik ve performans

- Bütün metin HTML olarak sayfadadır. Animasyon çalışmasa da içerik okunur.
- "Hareketi azalt" açıkken kapı ve yaklaşma animasyonları yerine sade geçişler kullanılır.
- Menü, kitaplar, lamba ve kitap diyaloğu klavyeyle kullanılır. Diyalog odağı içinde tutar, Esc ile kapanır.
- Telefonda sahneler dikey kadraja geçer, dokunma hedefleri en az 44 piksel olur.
- Animasyonlar yalnızca `transform` ve `opacity` kullanır.
- Hedefler: Lighthouse performans 90 ve üzeri, erişilebilirlik 95 ve üzeri. Bunlar ölçüp doğrulayacağımız hedefler, şimdiden verilmiş söz değil.

## 9. Test planı

**Birim testleri (Vitest)**

- Kamera: `enter = 0` iken kapı yerinde ve kapalı. `enter = 1` iken oda tam ekran. `approach = 1` iken kitaplık farklı ekran oranlarında ekrana sığıyor.
- Sarkaç: itildikten sonra genliği azalıyor ve sonunda duruyor.
- Üreteçler: aynı tohum aynı çıktıyı veriyor, hiçbir taş kapı boşluğuna taşmıyor.

**Uçtan uca (Playwright)**

- Sayfa hatasız yükleniyor.
- "Projeler" tıklanınca kitaplık geliyor ve kitaplar tıklanabiliyor.
- Kitap açılıyor, Esc ile kapanıyor, odak kitaba dönüyor.
- "Hareketi azalt" modunda bütün içerik görünüyor.
- Telefon ekranında yatay taşma yok.

## 10. Yapım sırası

Her adım ayrı bir PR. Sıra "önce içerik, sonra sihir" mantığıyla kuruldu: ikinci adımın sonunda site sade ama eksiksiz okunur hâlde olur, sonraki adımlar deneyimi katman katman ekler.

| # | PR | Bittiğinde |
|---|---|---|
| 1 | İskelet: Next.js, TypeScript, Tailwind, lint, test, CI | Boş ama çalışan bir sayfa var, CI yeşil. |
| 2 | İçerik ve düz sayfa | Bütün metinler ve projeler animasyonsuz, okunur bir sayfada. Bu aynı zamanda "hareketi azalt" görünümü. |
| 3 | Çekirdek: matematik, kamera, hareket ve testleri | `core` tamam ve testleri geçiyor. Henüz ekranda bir şey değişmedi. |
| 4 | Dış sahne: duvar, kapı, sarmaşık | Açılış ekranı çizili, hareketsiz. |
| 5 | Giriş: kamera kancası, kapının açılması | Kaydırınca kapı açılıyor, içeri giriliyor. |
| 6 | Oda, kitaplık ve kitap diyaloğu | Kitaplık öne geliyor, kitaplar açılıyor. |
| 7 | Işık: fener, açılış sahnesi, lamba | Demodaki deneyimin tamamı çalışıyor. |
| 8 | Çok dil, arama motoru bilgileri, paylaşım görseli | Seçilen dillerde yayında. |
| 9 | Cila: telefon, erişilebilirlik denetimi, performans ölçümü | Bölüm 8'deki hedefler ölçüldü. |
| 10 | Domain ve yayın | Site kendi adresinde. |

## 11. Açık kararlar

1. **Diller:** yalnızca İngilizce mi, Türkçe ve İngilizce mi, yoksa Rusça da mı?
2. **Proje görselleri:** her proje için en az iki ekran görüntüsü ya da fotoğraf.
3. **Çizimler:** kodla çizilmiş hâliyle mi yayınlanacak, yoksa elle çizilmiş görseller gelecek mi? Mimari ikisini de destekliyor.
4. **Kitap içi demolar:** gtutennis takvimi ve FireBot arenası gibi oynanabilir demolar ilk sürümde olsun mu?
5. **Domain adı.**

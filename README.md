# İş Defteri

Telefon için PWA. Harcama takibi, fiyat teklifleri, notlar ve yapılacaklar listesi — hepsi Supabase üzerinden gerçek zamanlı senkronize, birden fazla kişi aynı anda kullanabilir.

## 1. Supabase kurulumu

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluştur (yoksa).
2. Sol menüden **SQL Editor**'e gir, `supabase-setup.sql` dosyasının tamamını yapıştır ve çalıştır.
   - Bu, 4 tabloyu (expenses, quotes, notes, todos), erişim politikalarını, realtime aboneliğini ve `photos` adında public bir storage bucket'ı oluşturur.
3. **Settings > API** sayfasına git, şu iki değeri kopyala:
   - `Project URL`
   - `anon public` key

## 2. config.js dosyasını doldur

`config.js` dosyasını aç:

```js
const SUPABASE_URL = "https://SENIN-PROJE-ID.supabase.co";
const SUPABASE_ANON_KEY = "SENIN-ANON-KEY";
const APP_PIN = ""; // istersen 4 haneli bir PIN yaz, örn: "1234"
```

`APP_PIN` boş bırakılırsa kilit ekranı hiç çıkmaz. Not: Bu gerçek bir güvenlik önlemi değil, sadece telefonu eline alan birinin rastgele girmesini zorlaştırır — asıl veri koruması Supabase tarafında (kimin repo'ya/anon key'e erişebildiği) sağlanır.

## 3. GitHub Pages'e yükle

Daha önce tedarikçi takip uygulamanda yaptığın gibi:

1. Bu klasördeki tüm dosyaları yeni bir GitHub repo'suna yükle (örn. `isletme-defteri`).
2. Repo **Settings > Pages** kısmından `main` branch, `/ (root)` klasörünü seç ve kaydet.
3. Birkaç dakika sonra `https://kullaniciadi.github.io/isletme-defteri` adresinden erişilebilir olur.
4. Telefonda o adresi aç, tarayıcı menüsünden **"Ana ekrana ekle"** yaparsan uygulama gibi ikonla açılır.

⚠️ Not: Repo **public** olursa `config.js` içindeki anon key de herkese görünür olur. Anon key ile sadece yukarıdaki tablolara okuma/yazma yapılabilir (senin Supabase hesabına tam erişim değildir), ama yine de repo'yu **private** yapmanı öneririm (ücretsiz GitHub hesaplarında private repo + Pages Pro gerektirebilir; gerekirse Vercel/Netlify gibi ücretsiz statik host'lara private repo ile de deploy edebilirsin).

## Özellikler

- **Harcamalar**: tarih, kim harcadı, ne için, tutar. Aylık toplam ve ay filtresi.
- **Teklifler**: tarih, nereden alındı, ürün adı, fiyat, not, ürün fotoğrafı (kameradan çek veya galeriden seç).
- **Notlar**: serbest metin + opsiyonel fotoğraf.
- **Yapılacaklar**: metin + opsiyonel fotoğraf, tik ile tamamlandı işaretleme, açık/tamamlanan/tümü filtresi.
- Tüm veriler Supabase'de tutulur, birden fazla cihaz gerçek zamanlı senkronize olur (biri kayıt eklediğinde diğer telefonlarda anında görünür).
- Fotoğraflar Supabase Storage'da (`photos` bucket) saklanır.

## Sonradan değiştirmek istersen

- Renk paleti ve tasarım: `style.css` en üstündeki `:root` değişkenleri.
- Yeni alan eklemek (örn. harcamaya kategori): önce `supabase-setup.sql`'e benzer şekilde Supabase'de `alter table` ile kolon ekle, sonra `app.js`'teki ilgili form ve render fonksiyonuna alanı ekle.

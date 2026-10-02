# P05 — نتیجه مستقل قرارداد و preview

ادامهٔ جاری: [adapter v0.2 و گیت‌های دقیق](ADAPTER-v0.2-RESULT.md). گزارش زیر checkpoint اولیه است؛ اتصال خواندن GET/رسید P04 در ادامه افزوده شد، نوشتن/مهاجرت همچنان مسدود است.

تاریخ ۲۰۲۶-۱۰-۰۲ تهران؛ مرجع مصوب arash-product-plan-v0.1. این تحویل دو خروجی دارد، نه ادعای «انتقال انجام شد».

**اتصال Telegram:** قرارداد و کد189/193 و mini5 حفظ شدند. scoped link، proof کوتاه‌عمر، opt-in و قطع اتصال همان مدل موجودند؛ هویت/مجوز/انتشار تازه ساخته نشده. شواهد قبلی CI و mock پذیرش native دوطرفه یا ارسال بات نیستند. فرمان built-server ردشده با دلیل صرفاً `blocked by policy` از هیچ ابزار/فرمان/چت/مقصد جایگزینی تکرار نشد. runtime و bot/channel acceptance همچنان OPEN است.

**سبد مستقل miniapp:** موجودی مدل و مسیرهای خواندن/نوشتن بررسی شد؛ price currency، quantity unit، حساب، مالکیت، provenance و تاریخچه معاملات فاقد شاهدند. sourceCount واقعی UNKNOWN است؛ به MySQL زنده وصل نشدیم. [INVENTORY](INVENTORY.md)، [CONTRACT](CONTRACT.md) و [P04-ACK](P04-ACK.md) mapping، اختلاف، رسید آینده، freeze و rollback را ثبت می‌کنند.

مالک P04 قرارداد DTO موجود v0.1 درab2a0fd را تأیید کرد؛ دو سند با SHA256 pin شده‌اند. headبعدیP04=ce58305 فقط گزارش هماهنگی است و قراردادها تغییر نکرده‌اند. P00 هنوز صاحب مبنا/manifest/schema است؛191/195 ورودی read-only هستند، نه مبنای پذیرفته نهایی این بسته. P01/P04 و قرارداد انتشارP07 گیت اجرای وابسته‌اند.

کد مستقل فقط `server/p05/portfolio-preview.ts` و test آن است؛ هیچ route، transport، schema، package، DB یا UI مشترک تغییر نکرده. preview با هویت/منبع نامطمئن جزئیات خصوصی برنمی‌گرداند؛ quantity از DECIMAL بدون افت دقت تبدیل می‌شود؛ شناسه namespace+rowid، review به digest/base/linkEpoch/adapterVersion مقید است. قیمت قدیمی فقط شاهد خام و candidate همیشه unpriced با cost_basis=null است. کل اقلام canonical-only باید هنگام commit آینده حفظ شوند. receipt تکراری فقط جلوگیری از reimport را نشان می‌دهد، نه برابری مبلغ جاری سایت.

`commitBlocked=true` حتی برای candidate آماده، زیرا account/memberConfirmedAt/receipt و API خواندن/تطبیق و runtime گیت بازند. planWriteAuthority فقط intended one-writer را در mock نشان می‌دهد؛ old writerها واقعاً متوقف نشده‌اند و claim حفاظت runtime مجاز نیست. انتقال، rollback یا dual-write زنده پیاده/اجرا نشده.

## شاهد تازه

- ۱۰۰ تست هدفمند PASS: ۵۲ سناریوی preview/مقدار/تطبیق و ۴۸ ترکیب stage×freeze×receipt؛ فقط داده ساختگی، بدون API/DB/بات. suiteهای قدیمی برای فعالیت تکرار نشدند.
- Typecheck و buildVite+esbuild PASS؛ هیچ server/start/dev اجرا نشد. هشدارهای existing font/chunk در build.txt حفظ شده‌اند و رفع آن‌ها خارج مالکیت P05 است؛ runtime فونت/صفحه بررسی نشده.
- compatibility-check.ts candidate را به normalisePosition واقعی P04 داد؛ PASS با qty12.5، مالکیت50، unpriced/missing، بدون ارزش/قیمت/هزینه حدسی. synthetic-preview.json پیش‌نمایش قابل بازبینی است؛ API/DB مصرف نشده. این ابزار محلی نیازمند checkout همسایه P04 با hashثبت‌شده است و جزو CI مستقل نیست.
- خطای نخست TypeScript درباره BigInt literal در target قدیمی و loader ESM/CJS ابزار سازگاری حفظ و اصلاح شدند؛ شواهد خام typecheck-first-failure.txt و compatibility-first-loader-failure.txt، نتیجه نهایی جداست. تنظیمات/dependencyهای مشترک تغییر نکرده‌اند.
- PR miniapp روی شاخه mini5 stack می‌شود تا تغییرات mini5 تکرار نشوند. workflow موجود فقط pull_request به main را trigger می‌کند؛ نبود run برای stacked PR نباید CI سبز نامیده شود. وضعیت CI در checkpoint تحویل ثبت می‌شود.

## گیت و اقدام بعدی

P00: تعیین release SHA/hash/ترتیب schema و مالکیت مشترک. P01: نشست native، binding و دسترسی/سابقه پس از انقضا. P04: قرارداد canonical GET/receipt، account وmember confirmation، merge کامل وCAS. P05 پس از این‌ها: transport و durable source freeze با drain/DB fence، receipt/reconciliation و preview UI تأیید عضو؛ پذیرش synthetic مستقل و سپس تصمیم مالک برای cutover. مسئول مالی/عملیات تأیید rollback را می‌دهد؛ unknown commit تا تطبیق authoritative frozen می‌ماند.

منتشر/نصب‌شده: هیچ چیز. مشتری اکنون قابلیت تازه‌ای دریافت نکرده است؛ تحویل کد/قرارداد آماده بازبینی است. بدون merge، Production، مهاجرت واقعی، حذف اصل داده، خرید، پیام مشتری، کلید یا OTP در چت. گزارش با PR/SHA و فایل‌های شواهد به مدیر تحویل می‌شود؛ اسناد مرکزی فقط توسط مالکشان آشتی داده شوند.

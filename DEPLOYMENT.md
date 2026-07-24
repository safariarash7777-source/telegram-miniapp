# راهنمای استقرار روی Coolify

این راهنما نشان می‌دهد چطور این **Telegram Mini App** را روی [Coolify](https://coolify.io)
بالا بیاوری. اپ یک سرویس واحد است که هم رابط کاربری React و هم API (Express + tRPC)
را روی یک پورت سرو می‌کند و به یک دیتابیس **MySQL** نیاز دارد.

> **Coolify چیست؟** یک PaaS متن‌باز و self-host (مثل Heroku/Vercel شخصی) که روی
> سرور خودت نصب می‌شود و build از گیت، HTTPS خودکار، دیتابیس و مدیریت env را می‌دهد.
> خودِ Coolify رایگان است؛ فقط هزینه‌ی سرور (VPS) را می‌دهی.

---

## پیش‌نیازها

1. یک **سرور مجازی (VPS)** با Docker (مثلاً Hetzner، DigitalOcean، Contabo، ...).
2. **Coolify نصب‌شده** روی آن سرور — طبق [مستند نصب Coolify](https://coolify.io/docs/installation).
3. یک **دامنه** که به IP سرور اشاره کند (مثلاً `app.example.com`). برای تلگرام
   داشتن **HTTPS الزامی** است و Coolify خودش گواهی TLS را می‌گیرد.
4. یک **بات تلگرام** و توکنش از [@BotFather](https://t.me/BotFather).

---

## گام ۱ — ساخت دیتابیس MySQL در Coolify

1. در Coolify یک Project بساز (یا از پروژه‌ی موجود استفاده کن).
2. **+ New Resource → Database → MySQL** را بزن و سرویس را ایجاد کن.
3. بعد از بالا آمدن، **connection string** آن را بردار. فرمتش این‌طور است:

   ```
   mysql://<user>:<password>@<host>:3306/<database>
   ```

   نکته: چون اپ و دیتابیس روی همان Coolify هستند، از **آدرس داخلی** سرویس MySQL
   استفاده کن (نامِ سرویس/شبکه‌ی داخلی)، نه آدرس عمومی.

---

## گام ۲ — ساخت Application از روی این ریپازیتوری

1. **+ New Resource → Application → Public/Private Repository** و این ریپو را انتخاب کن.
2. برنچ مورد نظر را انتخاب کن.
3. **Build Pack** را روی **Dockerfile** بگذار (این ریپو یک `Dockerfile` آماده دارد).
4. **Port** را روی `3000` بگذار (همان چیزی که کانتینر expose می‌کند).

---

## گام ۳ — تنظیم متغیرهای محیطی (Environment Variables)

در تب **Environment Variables** اپ، این‌ها را ست کن. توضیح کامل هر کدام در فایل
`.env.example` هست.

**ضروری:**

| متغیر | مقدار |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | connection string از گام ۱ |
| `TELEGRAM_BOT_TOKEN` | توکن بات از BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | چت‌آی‌دی ادمین برای اعلان مشاوره‌ی جدید |
| `MINI_APP_URL` | `https://<دامنه‌ی همین اپ>` |

**توصیه‌شده:**

| متغیر | مقدار |
|---|---|
| `ADMIN_SECRET` | رشته‌ی تصادفی بلند — فقط دروازه‌ی endpoint راه‌اندازی `set-webhook` است؛ تا ست نشود آن endpoint کلا غیرفعال است |
| `JWT_SECRET` | رشته‌ی تصادفی برای امضای نشست کاربران (اگر ست نشود، به‌طور امن از bot token مشتق می‌شود) |
| `TELEGRAM_WEBHOOK_SECRET` | secret token وب‌هوک (اگر ست نشود، از bot token مشتق می‌شود — نیازی به ست کردن نیست) |

**فونت و لوگو:** دیگر به Manus وابسته نیستند — فایل‌ها داخل خود ریپو در
`client/public/fonts` و `client/public/images` قرار دارند. اگر هنوز کامیت
نشده‌اند، یک بار `sh scripts/fetch-brand-assets.sh` را روی یک شبکه‌ی آزاد اجرا
و خروجی را کامیت کن (تا وقتی دیپلوی قدیمی Manus زنده است).

> **متغیرهای `VITE_*`**: این‌ها در زمان **build** در فرانت جاسازی می‌شوند. اگر
> لازم داری (اکثراً اختیاری‌اند)، در Coolify به‌صورت **Build Variable** ست‌شان کن،
> نه فقط runtime.

---

## گام ۴ — دامنه و HTTPS

1. در تنظیمات اپ، در **Domains** دامنه‌ات را وارد کن (`https://app.example.com`).
2. Coolify خودش با Let's Encrypt گواهی TLS را صادر و HTTPS را فعال می‌کند.
3. مطمئن شو رکورد DNS دامنه به IP سرور اشاره می‌کند.

---

## گام ۵ — Deploy

1. دکمه‌ی **Deploy** را بزن. Coolify از روی `Dockerfile` ایمیج را build می‌کند.
2. هنگام بوت، `docker-entrypoint.sh` به‌طور خودکار migrationها را اجرا می‌کند
   (اگر `DATABASE_URL` ست باشد) و بعد سرور را استارت می‌زند. جدول‌های
   `users`, `telegram_users`, `consultations`, `analyses`, `portfolio_assets` ساخته می‌شوند.
3. در لاگ باید ببینی: `Server running on http://localhost:3000/`.

**بررسی سلامت:** یک health check روی مسیر `/api/telegram/health` یا `/` بگذار.

---

## گام ۶ — اتصال بات تلگرام (بعد از deploy)

1. **ثبت webhook** — این endpoint با `ADMIN_SECRET` محافظت می‌شود و آدرس وب‌هوک
   را خودش از `MINI_APP_URL` می‌سازد (از body گرفته نمی‌شود تا قابل سوءاستفاده
   نباشد). یک بار این درخواست را بزن:

   ```bash
   curl -X POST https://app.example.com/api/telegram/set-webhook \
     -H "X-Admin-Secret: <همان ADMIN_SECRET که در env ست کردی>"
   ```

   این کار وب‌هوک را همراه یک secret token ثبت می‌کند؛ از آن به بعد سرور فقط
   درخواست‌هایی را می‌پذیرد که واقعا از تلگرام آمده باشند (بقیه 403 می‌گیرند).

2. **تنظیم Mini App در BotFather** — در BotFather دستور `/newapp` (یا از منوی
   Bot Settings → Menu Button/Web App) و آدرس `https://app.example.com` را ست کن.

3. **تست** — بات را در تلگرام باز کن، `/start` بزن؛ باید دکمه‌ی باز کردن مینی‌اپ
   بیاید. سپس داخل مینی‌اپ فرم مشاوره را تست کن و ببین اعلانش به چت ادمین می‌رسد.

---

## تست محلی با Docker (اختیاری، قبل از Coolify)

```bash
# build
docker build -t telegram-miniapp .

# اجرا (مقادیر را با مقادیر واقعی جایگزین کن)
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATABASE_URL="mysql://user:pass@host:3306/db" \
  -e TELEGRAM_BOT_TOKEN="..." \
  -e MINI_APP_URL="https://app.example.com" \
  telegram-miniapp

# در ترمینال دیگر:
curl http://localhost:3000/api/telegram/health
```

اپ حتی بدون `DATABASE_URL` هم بالا می‌آید (ولی قابلیت ذخیره‌سازی غیرفعال می‌شود).

---

## عیب‌یابی

- **صفحه سفید / خطای asset**: مطمئن شو `pnpm build` موفق بوده و `dist/public/index.html`
  ساخته شده (در لاگ build چک کن).
- **دیتابیس وصل نمی‌شود**: صحت `DATABASE_URL` و دسترسی شبکه‌ی داخلی بین اپ و MySQL
  را چک کن؛ لاگ استارت را برای پیام migration ببین.
- **بات جواب نمی‌دهد**: بعد از هر تغییر دامنه، دوباره webhook را ثبت کن؛ و صحت
  `TELEGRAM_BOT_TOKEN` را بررسی کن. خروجی `GET /api/telegram/health` وضعیت بات و
  آدرس مینی‌اپ را نشان می‌دهد.
- **لوگو/فونت نمی‌آید**: طبیعی است اگر کلیدهای `BUILT_IN_FORGE_*` ست نشده باشند.

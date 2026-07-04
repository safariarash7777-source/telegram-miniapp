# مینی اپ تلگرام آرش صفری - TODO

## Database Schema
- [x] جدول telegram_users (احراز هویت تلگرام)
- [x] جدول consultations (درخواست‌های مشاوره)
- [x] جدول analyses (تحلیل‌های اقتصادی)
- [x] جدول portfolios (سبد دارایی کاربران)
- [x] اجرای migration ها

## Backend
- [x] Telegram authentication router (registerUser, getUser)
- [x] Consultation router (submit, list by telegramId)
- [x] Analysis router (list, getById, create - admin)
- [x] Portfolio router (save, get by telegramId)
- [x] Price proxy endpoint (gold, USD, EUR, bourse)
- [x] Telegram webhook router (/start, /help commands)
- [x] Telegram notification service (send to Arash Safari on new consultation)
- [x] db.ts helpers برای همه جداول

## Frontend - Core
- [x] index.css - تم تاریک مالی با رنگ‌های cyan و pink
- [x] client/index.html - فونت Vazirmatn، RTL، Telegram WebApp script
- [x] App.tsx - routing با bottom nav، Telegram WebApp init
- [x] useTelegramWebApp hook
- [x] BottomNav component
- [x] TelegramLogin page - با fallback برای dev

## Frontend - Pages
- [x] Dashboard - قیمت‌های زنده (طلا، دلار، یورو، بورس)
- [x] Calculator - ماشین‌حساب سرمایه‌گذاری با نمودار Recharts
- [x] Analysis - تحلیل‌های اقتصادی با فیلتر دسته‌بندی
- [x] Consultation - فرم درخواست مشاوره
- [x] Profile - پروفایل کاربر + تاریخچه مشاوره‌ها
- [x] About - درباره آرش صفری (در صفحه Profile ادغام شد)

## Telegram Integration
- [x] Telegram.WebApp.ready() و expand()
- [x] Telegram.WebApp.setHeaderColor()
- [x] Telegram BackButton integration
- [x] Telegram MainButton در صفحه مشاوره
- [x] Webhook برای /start command با دکمه Mini App

## Tests
- [x] تست telegram auth router
- [x] تست consultation router
- [x] تست price proxy

## Secrets & Config
- [x] TELEGRAM_BOT_TOKEN secret
- [x] TELEGRAM_ADMIN_CHAT_ID secret (chat ID آرش صفری)

## بازطراحی و بهبود (فاز ۲)
- [x] رفع مشکل ورود - تغییر auth gate از isRegistered به isVerified
- [x] صفحه ProfileSetup برای کاربران جدید (نام + شماره تماس)
- [x] بازطراحی تم به navy/gold مشابه portfolio-platform
- [x] اعمال فونت Pelak از هویت بصری برند
- [x] داشبورد ۴ تب: طلا، سکه، ارز، حباب
- [x] price-service.ts با caching 5 دقیقه و rate-limit handling
- [x] محاسبه حباب سکه (امامی، نیم‌سکه، ربع‌سکه)
- [x] نرخ تبدیل طلا (۱۸ عیار، ۲۴ عیار، مثقال)
- [x] رفع خطای @apply badge-navy در Tailwind 4
- [x] رفع timeout تست price.getLive با mock
- [x] Publish پروژه و تنظیم Webhook تلگرام (نیاز به اقدام کاربر دارد - راهنما در خروجی ارائه شد)
- [x] تنظیم Mini App URL در BotFather (نیاز به اقدام کاربر دارد - راهنما در خروجی ارائه شد)

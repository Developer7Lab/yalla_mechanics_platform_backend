git commit -m "feat: complete full-stack REST API frontend — auth, user, mechanic, admin dashboards

════════════════════════════════════════════════════════════════
 YALLA FRONT — Next.js Frontend for REST API Backend
════════════════════════════════════════════════════════════════

## ما تم بناؤه (What was built)

### 1. src/app/auth/page.js — صفحة المصادقة
─────────────────────────────────────────────
- تصميم split-layout: لوحة ديكورية يسار + فورم يمين
- تسجيل الدخول: POST /api/auth/login → { username, password }
- إنشاء حساب: POST /api/auth/register → { username, password, fullName, email, role }
- تحديث التوكن: POST /api/auth/refresh → { refreshToken } في الـ body
- جلب بيانات المستخدم: GET /api/auth/me → Bearer accessToken
- تسجيل الخروج: POST /api/auth/logout
- توجيه تلقائي حسب الدور بعد الدخول:
    user      → /user
    mechanic  → /mechanics
    admin     → /admin
- يتحقق من localStorage عند التحميل → يعيد التوجيه فوراً إذا كان هناك توكن صالح
- يحفظ في localStorage: accessToken, refreshToken, userRole, userData
- اختيار الدور (user/mechanic) عند التسجيل فقط — admin لا يُنشأ من الواجهة

### 2. src/app/user/page.js — لوحة المستخدم
─────────────────────────────────────────────
- GET  /api/users/profile         → عرض وتعديل الملف الشخصي
- PUT  /api/users/profile         → تحديث username, fullName, email, bio, phone
- GET  /api/users/mechanics       → قائمة جميع الميكانيكيين مع مواقعهم + بحث
- GET  /api/users/mechanics/:id/reviews → تقييمات ميكانيكي محدد مع متوسط النجوم
- POST /api/users/reviews         → إرسال تقييم (rating 1-5, comment max 1000)
- GET  /api/users/my-reviews      → جميع تقييمات المستخدم الحالي
- navigation sidebar بـ 3 صفحات: الملف / الميكانيكيون / تقييماتي
- تصميم: teal/indigo palette — اسم المشروع AutoCare

### 3. src/app/mechanics/page.js — لوحة الميكانيكي
─────────────────────────────────────────────────────
- GET  /api/mechanics/profile              → عرض الملف الشخصي
- PUT  /api/mechanics/profile              → تحديث البيانات
- GET  /api/mechanics/location             → الموقع الحالي
- POST /api/mechanics/location-requests    → طلب تحديث موقع جديد { businessName, address }
- GET  /api/mechanics/location-requests    → سجل جميع الطلبات مع الحالة
- GET  /api/mechanics/notifications        → الإشعارات مرتبة بالأحدث
- POST /api/mechanics/notifications/read   → تحديد الكل كمقروء
- GET  /api/mechanics/reviews              → تقييماتي + averageRating + totalReviews
- نظرة عامة: 4 إحصائيات + موقع حالي + أحدث 3 تقييمات
- StatusBadge: pending / approved / rejected
- navigation sidebar بـ 5 صفحات
- تصميم: amber/orange-red palette — اسم المشروع MechPanel
- badge نابض على الإشعارات غير المقروءة

### 4. src/app/admin/page.js — لوحة المدير
─────────────────────────────────────────────
- GET    /api/admin/profile                          → الملف الشخصي
- PUT    /api/admin/profile                          → تحديث البيانات
- GET    /api/admin/stats                            → 6 إحصائيات شاملة
- GET    /api/admin/location-requests/pending        → الطلبات المعلقة فقط
- GET    /api/admin/location-requests                → جميع الطلبات
- GET    /api/admin/location-requests/:id/verify     → تحقق عبر SerpAPI
- POST   /api/admin/location-requests/:id/approve    → قبول + اختيار نتيجة SerpAPI
- POST   /api/admin/location-requests/:id/reject     → رفض + سبب الرفض
- GET    /api/admin/mechanics                        → جميع الميكانيكيين + مواقعهم + طلباتهم المعلقة
- DELETE /api/admin/mechanics/:id/location           → حذف موقع ميكانيكي
- DELETE /api/admin/mechanics/:id                    → حذف حساب ميكانيكي كامل
- GET    /api/admin/users                            → جميع المستخدمين
- DELETE /api/admin/users/:id                        → حذف حساب مستخدم
- Confirm Modal قبل كل عملية حذف
- Reject Modal مع textarea لسبب الرفض
- SerpAPI verify flow: يعرض 3 نتائج كل واحدة بزر اختيار
- تصميم: indigo/violet palette — اسم المشروع AdminPanel

### 5. createAdmin.js — سكريبت إنشاء المدير
─────────────────────────────────────────────
- يتصل بـ MongoDB مباشرة
- يتحقق إذا admin موجود مسبقاً (لا يكرر)
- يعمل bcrypt hash لكلمة المرور يدوياً
- يُشغَّل مرة واحدة: node createAdmin.js

════════════════════════════════════════════════════════════════
 البنية التقنية المشتركة (Shared Technical Architecture)
════════════════════════════════════════════════════════════════

التوكن والمصادقة:
  - accessToken   → Authorization: Bearer header في كل طلب محمي
  - refreshToken  → يُرسل في body عند /refresh (بدون auth header)
  - localStorage  → accessToken, refreshToken, userRole, userData

الاستجابة الموحدة من الباك إند:
  { success: true, data: { ... } }
  { success: false, error: 'message' }

الميزات المشتركة في كل لوحة:
  - useCallback للـ fetch helper لتجنب stale closures
  - loading states على كل زر async
  - Toast notifications (نجاح/خطأ) تختفي بعد 3.5 ثانية
  - حماية: redirect لـ /auth إذا لم يكن هناك accessToken
  - استجابة كاملة للموبايل

التصميم:
  - خط Tajawal (عربي) + Sora (brand)
  - direction: rtl على كل الصفحات
  - Dark theme موحد مع ألوان مختلفة لكل لوحة
  - glass morphism cards + backdrop-filter: blur
  - CSS animations: fadeUp, blob float, pulse, spin
  - بدون مكتبات UI خارجية — pure CSS

════════════════════════════════════════════════════════════════
 هيكل المشروع (Project Structure)
════════════════════════════════════════════════════════════════

yalla_front/
├── src/
│   └── app/
│       ├── auth/
│       │   └── page.js        ← صفحة الدخول والتسجيل + routing
│       ├── user/
│       │   └── page.js        ← لوحة المستخدم (6 routes)
│       ├── mechanics/
│       │   └── page.js        ← لوحة الميكانيكي (8 routes)
│       ├── admin/
│       │   └── page.js        ← لوحة المدير (13 routes)
│       ├── globals.css
│       ├── layout.js
│       └── page.js            ← redirect → /auth
├── createAdmin.js             ← سكريبت إنشاء المدير (backend folder)
├── package.json
└── next.config.mjs

Backend API Base URLs:
  http://localhost:3001/api/auth
  http://localhost:3001/api/users
  http://localhost:3001/api/mechanics
  http://localhost:3001/api/admin

════════════════════════════════════════════════════════════════
 إجمالي الـ API Routes المغطاة: 31 route
════════════════════════════════════════════════════════════════

  auth      →  5 routes  (login, register, refresh, me, logout)
  users     →  6 routes  (profile GET/PUT, mechanics, reviews GET/POST, my-reviews)
  mechanics →  8 routes  (profile GET/PUT, location, location-requests GET/POST, notifications GET/POST, reviews)
  admin     → 13 routes  (profile GET/PUT, stats, location-requests×5, mechanics×3, users×2)
             ─────────
  Total     → 32 routes
"
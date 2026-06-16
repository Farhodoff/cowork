# Splitter App — Loyiha Hisoboti (Project Report)

**Loyiha nomi:** Splitter App (Hisobni bo'lishish ilovasi / 割り勘アプリ)
**Sana:** 2026-yil, Iyun
**Holat:** ✅ To'liq ishlaydigan MVP (Completed & Operational)

---

## 1. Loyiha Haqida (Overview)

Chekni kamera bilan skanerlash va AI yordamida avtomatik hisob-kitob qiluvchi mobil ilova.
(Camera receipt scanning + AI-powered automatic bill splitting mobile app.)

**Asosiy g'oya:** Restoranda guruh bo'lib ovqatlanganda — kim nima yedi, kim kimga qancha qarzdor — barchasini avtomatik hisoblash.

---

## 2. Bajarilgan Ishlar (Key Achievements)

### ✅ Backend (Server)
- **Node.js + TypeScript** da Express server qurildi
- **PostgreSQL** ma'lumotlar bazasi sozlandi (8 ta model, 4 ta migration)
- **Prisma ORM** orqali xavfsiz ma'lumotlar boshqaruvi
- **JWT** autentifikatsiya (7 kun amal qiladi, bcrypt shifrlash)
- **Swagger UI** — API hujjatlari (10+ endpoint)
- **Docker** konteyner bilan deployment

### ✅ AI Integratsiyasi
- **Google Gemini 2.5 Flash** — chek rasmini avtomatik taniydi
- Mahsulot nomi, narxi va miqdorini ajratib oladi
- **Magic AI Split** — ovoz yoki matn bilan avtomatik taqsimlash
- Ko'p tilli cheklarni qo'llab-quvvatlaydi (UZ, JA, EN, RU)

### ✅ Frontend (Mobil Ilova)
- **React Native + Expo** — iOS va Android uchun
- **Tamagui** — zamonaviy dark theme UI
- **Expo Router** — navigatsiya (Stack, Tabs, Modals)
- **Zustand + React Query** — state management
- **i18next** — 3 tilda (English, 日本語, O'zbekcha)
- **React Hook Form + Zod** — formalar va validatsiya

### ✅ App Integratsiyasi
- Foydalanuvchi ro'yxatdan o'tishi va kirishi
- Do'st qo'shish (ID, QR kod, qidiruv)
- Guruh yaratish va boshqarish
- Chek skanerlash va tahrirlash
- Hisobni taqsimlash (teng / dona bo'yicha)
- Sessiya tarixi

---

## 3. Texnologiyalar (Technology Stack)

### Backend
- **Til:** TypeScript, Node.js
- **Framework:** Express.js
- **Ma'lumotlar bazasi:** PostgreSQL, Prisma ORM
- **AI:** Google Gemini API (gemini-2.5-flash)
- **Autentifikatsiya:** JWT, bcrypt
- **Hujjat:** Swagger UI
- **Deployment:** Docker

### Frontend
- **Framework:** React Native 0.81, Expo SDK 54
- **Navigatsiya:** Expo Router 6.0
- **UI:** Tamagui 1.132
- **State:** Zustand 5, React Query 5
- **Formalar:** React Hook Form + Zod
- **Tillar:** i18next (EN, JA, UZ)
- **Audio:** expo-audio (ovoz yozish)
- **Kamera:** expo-camera, expo-image-picker

---

## 4. Ma'lumotlar Bazasi (Database Schema)

8 ta model:
- **User** — foydalanuvchilar (email, parol, username, uniqueId, avatar)
- **Friendship** — do'stlik (PENDING, ACCEPTED, REJECTED, BLOCKED)
- **Group** — guruhlar (nom, egasi, a'zolar)
- **GroupMember** — guruh a'zolari (MEMBER, ADMIN rollari)
- **Session** — sessiyalar (chek rasmi, summa, holat)
- **ReceiptItem** — chek mahsulotlari (nom, narx)
- **ItemAssignment** — taqsimot (mahsulot → foydalanuvchi)
- **SessionHistoryEntry** — tarix (JSON payload, valyuta, sanalar)

---

## 5. Asosiy Funksiyalar

1. **Autentifikatsiya** — ro'yxatdan o'tish, kirish, JWT token
2. **Do'stlik** — ID/QR/qidiruv orqali do'st qo'shish
3. **Guruhlar** — yaratish, a'zo boshqarish, faoliyat kuzatish
4. **Chek skanerlash** — AI orqali avtomatik tanish
5. **Taqsimlash** — teng yoki dona bo'yicha, Magic AI Split
6. **Valyuta** — UZS, USD, EUR, RUB, JPY
7. **Tarix** — sessiyalarni saqlash va ko'rish

---

## 6. Test Natijalari

- **Backend testlar:** API endpoint testlari muvaffaqiyatli
- **Frontend testlar:** 5 suite, 23 test — 100% muvaffaqiyatli
- **AI aniqligi:** Ko'p chek formatlarini to'g'ri taniydi
- **API javob vaqti:** <100ms

---

## 7. Xulosa (Conclusion)

Tizim to'liq ishga tayyor va istalgan vaqtda demonstratsiya qilish mumkin.
(The system is fully operational and ready for demonstration.)

**Loyiha orqali o'rganganlarim:**
- Full-stack development (Backend + Frontend + DB + AI)
- TypeScript — xavfsiz kod yozish
- Sun'iy intellekt amaliy integratsiyasi
- Mobil ilova yaratish (React Native)
- Loyiha boshqaruvi va hujjatlashtirish

---

**Aloqa:**
📧 Email: fsoyilov@gmail.com
📂 GitHub: github.com/saidojp/splitter-backend

# 🎬 Splitter App — Taqdimot Matni

**Loyiha nomi:** Splitter App (Hisobni bo'lishish ilovasi)
**Taqdimot vaqti:** 10-15 daqiqa
**Holat:** ✅ To'liq ishlaydigan MVP

---

## 1. Kirish (1 daqiqa)

Assalomu alaykum, hurmatli ustozlar va kursdoshlar!

Bugungi kunda do'stlar yoki hamkasblar bilan restoranda ovqatlanish odatiy hol. Lekin hisob kelganda — "kim nima yedi?", "kim qancha to'lashi kerak?" degan savollar paydo bo'ladi. Bu muammoni hal qilish uchun men **Splitter App** ilovasini yaratdim.

**Splitter App** — bu sun'iy intellekt (AI) yordamida chekni avtomatik skanerlaydigan va hisobni ishtirokchilar o'rtasida taqsimlaydigan mobil ilova.

---

## 2. Muammo va Yechim (1 daqiqa)

### Muammo:
- Guruh bo'lib ovqatlangandan keyin hisob-kitob qilish qiyin
- Kim nima buyurtma qilganini eslab qolish qiyin
- Kalkulyator bilan qo'lda hisoblash — vaqt va energiya sarflaydi
- Xato hisoblash — do'stlik munosabatlariga zarar yetkazishi mumkin

### Yechim — Splitter App:
1. **Chekni skanerlash** → Kamera bilan rasmga olish
2. **AI avtomatik taniydi** → Mahsulot nomi va narxini ajratib oladi
3. **Taqsimlash** → Har bir mahsulotni kimga tegishli ekanligini belgilash
4. **Natija** → Kim kimga qancha qarzdor — avtomatik hisoblanadi

---

## 3. Texnologiyalar (2 daqiqa)

### Backend (Server qismi)
| Texnologiya | Vazifasi |
|-------------|----------|
| **TypeScript + Node.js** | Server dasturlash tili va muhit |
| **Express.js** | Web framework (API yo'nalishlari) |
| **PostgreSQL + Prisma** | Ma'lumotlar bazasi va ORM |
| **Google Gemini AI** | Chek rasmini taniydigan sun'iy intellekt |
| **JWT (JSON Web Token)** | Xavfsiz autentifikatsiya |
| **Swagger UI** | API hujjatlari |
| **Docker** | Konteynerlashtirish |

### Frontend (Mobil ilova)
| Texnologiya | Vazifasi |
|-------------|----------|
| **React Native + Expo** | iOS va Android uchun cross-platform ilova |
| **Tamagui** | Zamonaviy UI komponentlar kutubxonasi |
| **Expo Router** | Navigatsiya (stack, tabs, modals) |
| **Zustand** | Holat boshqaruvi (state management) |
| **React Query** | Server ma'lumotlarini keshlash |
| **React Hook Form + Zod** | Formalar va validatsiya |
| **i18next** | Ko'p tillilik (EN, JA, UZ) |

### Ma'lumotlar bazasi tuzilishi (8 ta model):
- **User** — foydalanuvchilar
- **Friendship** — do'stlik munosabatlari
- **Group** — guruhlar va a'zolar
- **Session** — hisobni bo'lishish seanslari
- **ReceiptItem** — chekdagi mahsulotlar
- **ItemAssignment** — mahsulot taqsimoti
- **SessionHistoryEntry** — tarix yozuvlari
- **GroupActivity** — guruh faoliyati

---

## 4. Jonli Demo (5 daqiqa)

### 1-qadam: Backend ishga tushirish
```bash
cd splitter-backend && npm start
# Server: http://localhost:3001
# Health: http://localhost:3001/health → {"status":"ok"}
```

### 2-qadam: API hujjatlari
Brauzerda ochamiz: `http://localhost:3001/api-docs/`
- **Swagger UI** orqali barcha API endpointlar ko'rinadi
- 10+ ta yo'nalish: auth, friends, groups, sessions, uploads, analytics

### 3-qadam: Foydalanuvchi ro'yxatdan o'tkazish
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"demo123","username":"Demo User"}'
```
Natija: JWT token qaytadi (7 kun amal qiladi)

### 4-qadam: Chek skanerlash (AI)
```bash
./test_receipt_scan.sh
```
- Chek rasmini Base64 formatda yuboramiz
- **Google Gemini 2.5 Flash** 2-3 soniyada taniydi:
```json
{
  "items": [
    {"name": "Coca-Cola 0.5L", "price": 12000, "quantity": 3},
    {"name": "Osh", "price": 35000, "quantity": 4},
    {"name": "Xizmat haqi", "price": 5000, "quantity": 1}
  ]
}
```

### 5-qadam: Magic AI Split (Ovozli bo'lishish)
Ilovada **"Magic Split"** tugmasini bosamiz:
- Matn yoki ovoz bilan: *"Ali kabob yedi, choyni men va Vali ichdik"*
- AI avtomatik mahsulotlarni to'g'ri odamlarga taqsimlaydi
- `expo-audio` orqali ovoz yozib olish, Gemini AI ga yuborish

### 6-qadam: Avtomatik testlar
```bash
cd splitter-frontend && npx jest
# Natija: 5 test suite, 23 test — 100% muvaffaqiyatli
```

---

## 5. Asosiy Funksiyalar (2 daqiqa)

### ✅ Amalga oshirilgan funksiyalar:

**1. Autentifikatsiya**
- Ro'yxatdan o'tish va kirish
- JWT token bilan xavfsiz sessiya
- Parolni bcrypt bilan shifrlash

**2. Do'stlik tizimi**
- ID bo'yicha do'st qo'shish
- QR kod orqali do'stlik taklifi
- Kiruvchi/chiqquvchi so'rovlarni boshqarish

**3. Guruhlar**
- Guruh yaratish va boshqarish
- A'zolarni qo'shish/o'chirish
- ADMIN va MEMBER rollari
- Guruh faoliyatini kuzatish

**4. Chek skanerlash**
- Kamera orqali rasmga olish
- Google Gemini AI — mahsulot nomi va narxini ajratish
- Qo'lda tahrirlash imkoniyati

**5. Hisobni taqsimlash**
- **Teng bo'lish** — barcha ishtirokchilar barobar to'laydi
- **Dona bo'yicha** — har bir mahsulotni kimga belgilash
- **Magic AI Split** — ovoz yoki matn bilan avtomatik taqsimlash
- Valyutani o'zgartirish (UZS, USD, EUR, RUB, JPY)

**6. Tarix**
- Har bir sessiya tarixda saqlanadi
- Yakuniy natijalar: kim kimga qancha qarzdor
- Filtrlash va statistika

---

## 6. Texnik Qiyinchiliklar va Yechimlar (2 daqiqa)

### 1. AI aniqligi
**Muammo:** Turli xil chek formatlari (O'zbek, Yapon, Rus tillarida)
**Yechim:**
- Google Gemini 2.5 Flash — eng yangi model
- Prompt engineering — AI ga aniq ko'rsatmalar
- Fallback — AI xato qilsa, qo'lda tahrirlash

### 2. Murakkab hisob-kitob
**Muammo:** 6 ta kofe, 3 ta osh, 2 ta shirinni 5 kishiga qanday bo'lish?
**Yechim:**
- 2 ta rejim: teng bo'lish va dona bo'yicha
- Yaxlitlash algoritmi — oxirgi kishiga qoldiq tushadi
- Backend va Frontend'da bir xil hisoblash (`receipt-calculator`)

### 3. Real-time sinxronizatsiya
**Muammo:** Bir vaqtda bir nechta foydalanuvchi chekni tahrirlaydi
**Yechim:**
- Zustand — global store
- React Query — server keshi
- Session holati: ACTIVE → CLOSED

### 4. UI/UX dizayn
**Muammo:** Murakkab funksiyalarni oddiy ko'rsatish
**Yechim:**
- Tamagui — zamonaviy dark theme
- Glass morphism dizayn (shisha effekti)
- Gradient tugmalar va animatsiyalar
- 3 tilda lokalizatsiya (EN, JA, UZ)

---

## 7. Natijalar va Raqamlar (1 daqiqa)

### Ishlash ko'rsatkichlari:
- API javob vaqti: **<100ms**
- Ma'lumotlar bazasi so'rovlari: **<50ms**
- AI ishlash vaqti: **2-3 soniya**
- Test muvaffaqiyati: **23/23 (100%)**

### Xavfsizlik:
- JWT autentifikatsiya (7 kun amal qiladi)
- Parol bcrypt bilan shifrlanadi
- CORS sozlamalari
- SQL inyeksiyadan himoya (Prisma ORM)

### Loyiha hajmi:
- **Backend:** 15+ fayl (routes, services, middleware)
- **Frontend:** 40+ ekran va komponent
- **Ma'lumotlar bazasi:** 8 ta model, 4 ta migration
- **API endpointlar:** 10+ ta

---

## 8. Nima O'rgandim (1 daqiqa)

### Texnik bilimlar:
1. **TypeScript** — xavfsiz va ishonchli kod yozish
2. **PostgreSQL + Prisma** — murakkab ma'lumotlar bazasini boshqarish
3. **Google Gemini AI** — amaliy sun'iy intellekt integratsiyasi
4. **React Native + Expo** — mobil ilova yaratish
5. **Tamagui** — zamonaviy UI framework bilan ishlash

### Loyiha boshqaruvi:
1. **Rejalash** — avval arxitektura, keyin kod
2. **Hujjatlar** — kelajakdagi o'zim uchun eng yaxshi yordam
3. **Testlar** — kodni o'zgartirishda xotirjamlik
4. **Git** — versiyalarni boshqarish va hamkorlik

### Eng muhim dars:
**Reja → Amalga oshirish → Test → Hujjat**
Bu siklning muhimligini amaliyotda his qildim.

---

## 9. Kelajak Rejalari (1 daqiqa)

### Qisqa muddatli:
- UI/UX ni yanada yaxshilash
- Test qamrovini 100% ga yetkazish
- Offline rejim qo'shish

### Uzoq muddatli:
- To'lov tizimlari integratsiyasi (Click, Payme, Stripe)
- Push xabarnomalar
- Ko'proq tillar qo'shish
- Web versiya yaratish
- OCR aniqligini oshirish

---

## 10. Xulosa (1 daqiqa)

### Loyiha natijalari:
- ✅ **To'liq ishlaydigan** mobil ilova (iOS + Android)
- ✅ **Sun'iy intellekt** integratsiyasi (Gemini AI)
- ✅ **Avtomatik testlar** bilan sifat kafolati
- ✅ **3 tilda** lokalizatsiya
- ✅ **Docker** bilan deployment tayyor

### Yakuniy fikr:
Bu loyiha orqali men **full-stack development** ning quvonchi va qiyinchiliklarini o'rgandim. Backend'dan tortib mobil ilovagacha, ma'lumotlar bazasidan tortib sun'iy intellektgacha — barchasini o'z qo'llarim bilan yaratdim.

---

## 💬 Savollar

**Savollaringiz bormi?**

| Tez-tez so'raladigan savollar | Javob |
|------|-------|
| Rivojlantirish qancha vaqt oldi? | ~1 oy, 100+ soat |
| Eng qiyin narsa nima edi? | AI integratsiyasi va DB dizayni |
| Haqiqatan ham ishlatib ko'rsa bo'ladimi? | Ha! Demo muhit tayyor |
- Qaysi AI modeli ishlatilgan? — Google Gemini 2.5 Flash
- Nechta foydalanuvchini qo'llab-quvvatlaydi? — Cheksiz (server kuchiga bog'liq)
- Offline ishlayaptimi? — Hozircha yo'q, lekin kelajakda rejalashtirilgan

---

## 📋 Demo tayyorlash checklist

### Taqdimotdan oldin (5 daqiqa oldin):
- [ ] Backend ishga tushirilgan (`npm start` — splitter-backend)
- [ ] Frontend ishga tushirilgan (`npx expo start` — splitter-frontend)
- [ ] PostgreSQL ishlab turibdi
- [ ] Brauzerda Swagger UI ochilgan
- [ ] Terminal oynalari tartiblangan

### Favqulodda holatlar:
- Agar demo ishlamasa → **skrinshotlar** yoki **Swagger UI** orqali tushuntiring
- Agar savolga javob bilmaysiz → *"Yaxshi savol! Batafsil o'rganib, keyin javob beraman"*

---

**E'tiboringiz uchun rahmat!**

📧 Email: fsoyilov@gmail.com
📂 GitHub: github.com/saidojp/splitter-backend

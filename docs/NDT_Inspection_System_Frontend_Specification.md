# NDT Inspection System — Frontend Specification

## 1. Project Overview

**NDT Inspection System** adalah aplikasi web internal untuk digitalisasi proses inspeksi dan evaluasi Non-Destructive Testing (NDT).

Fokus frontend:
- Login dan autentikasi UI
- Dashboard inspeksi
- Pembuatan inspeksi baru
- Mapping indikasi/cacat pada gambar 2D
- Perhitungan `% Unbound` secara real-time
- Evaluasi terhadap Acceptance Criteria
- Riwayat inspeksi
- Detail hasil inspeksi
- Export laporan PDF
- Responsive desktop-first interface

> Catatan: fitur **Draft** ditunda dan tidak dimasukkan pada versi frontend awal.

---

## 2. Target Pengguna

Frontend dirancang untuk pengguna internal PT PLN, terutama pengguna yang melakukan atau memeriksa data inspeksi.

### Role frontend awal

Untuk versi pertama, role belum perlu dibuat kompleks. Gunakan satu alur pengguna:

- User login
- User masuk ke Dashboard
- User membuat inspeksi
- User menyimpan hasil inspeksi
- User melihat History
- User membuka Detail
- User melakukan Export PDF

Role/permission yang lebih detail dapat ditambahkan setelah backend tersedia.

---

## 3. Visual Design Direction

### Design Style

Gunakan gaya:

**Industrial + Technical + Clean + Professional**

Karakter:
- Minimalis
- Banyak whitespace
- Struktur data jelas
- Border tipis
- Shadow sangat ringan
- Radius kecil/medium
- Tidak menggunakan gradient berlebihan
- Tidak menggunakan dekorasi yang tidak berhubungan dengan inspeksi
- Desktop-first karena area mapping membutuhkan ruang besar

---

## 4. Brand Color

Warna UI harus mengikuti identitas visual PT PLN, tetapi tetap menjaga keterbacaan sebagai aplikasi engineering.

### Recommended Palette

| Token | Hex | Penggunaan |
|---|---|---|
| `primary` | `#0072CE` | Tombol utama, active state, link |
| `primary-dark` | `#005B9A` | Hover/dark state |
| `primary-light` | `#E8F4FC` | Background active/selected |
| `accent` | `#FFD100` | Highlight PLN, icon emphasis |
| `background` | `#F5F7FA` | Background aplikasi |
| `surface` | `#FFFFFF` | Card, panel, table |
| `border` | `#E2E8F0` | Border |
| `text-primary` | `#172033` | Judul dan teks utama |
| `text-secondary` | `#64748B` | Label dan teks sekunder |
| `success` | `#16A34A` | ACC |
| `danger` | `#DC2626` | REJECT |
| `warning` | `#F59E0B` | Warning |
| `info` | `#0284C7` | Informasi |

> Nilai warna dapat disesuaikan kembali dengan file logo/brand guideline PLN yang digunakan pada implementasi final. Jangan membuat logo PLN sendiri; gunakan asset logo resmi yang tersedia.

### Color Principle

- **Biru PLN** = primary/action
- **Kuning PLN** = accent/highlight
- **Hijau** = ACC
- **Merah** = REJECT
- **Abu-abu** = neutral/UI structure

Jangan menggunakan kuning sebagai warna utama tombol karena kontras teks dan accessibility harus tetap dijaga.

---

## 5. Typography

Recommended:

**Inter**

Hierarchy:

- Page title: 24–28px, semibold
- Section title: 15–16px, semibold
- Body: 14px
- Label: 12–13px
- Table: 13–14px
- Caption/helper text: 12px

Gunakan font-weight 400–700 secara terbatas.

---

# 6. Frontend Pages

Frontend versi awal terdiri dari **5 route/page utama** jika Login ikut dihitung:

```text
/login
/dashboard
/inspection/new
/inspection/history
/inspection/:id
```

### Page 0 — Login

Halaman autentikasi.

### Page 1 — Dashboard

Ringkasan inspeksi.

### Page 2 — New Inspection

Workspace utama untuk input, mapping, calculation, dan evaluation.

### Page 3 — Inspection History

Daftar seluruh inspeksi yang sudah tersimpan.

### Page 4 — Inspection Detail

Detail lengkap satu inspeksi + mapping + hasil + export PDF.

---

# 7. Global Layout

Setelah login, gunakan layout:

```text
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├───────────────┬─────────────────────────────────────────┤
│               │                                         │
│ Sidebar       │ Main Content                            │
│               │                                         │
│ Dashboard     │                                         │
│ New Inspection│                                         │
│ History       │                                         │
│               │                                         │
│               │                                         │
│               │                                         │
└───────────────┴─────────────────────────────────────────┘
```

### Sidebar

Menu:

1. Dashboard
2. New Inspection
3. Inspection History

Bagian bawah:

4. User Profile
5. Logout

Settings belum wajib dibuat pada versi pertama.

---

# 8. Login Page

Route:

```text
/login
```

### Layout

Gunakan split layout sederhana:

```text
┌──────────────────────┬─────────────────────────────────┐
│                      │                                 │
│   PLN / NDT          │        LOGIN                    │
│   branding area      │                                 │
│                      │   Email / Username              │
│   NDT Inspection     │   [.........................]   │
│   System              │                                 │
│                      │   Password                      │
│                      │   [.........................]   │
│                      │                                 │
│                      │   [        Login        ]       │
│                      │                                 │
└──────────────────────┴─────────────────────────────────┘
```

### Login components

- PLN logo
- Application name
- Username/email input
- Password input
- Show/hide password
- Remember me (optional)
- Login button
- Error message

### Login state

```text
idle
loading
success
error
```

Error harus tampil inline:

> Username atau password tidak valid.

Jangan menggunakan alert browser.

---

# 9. Dashboard Page

Route:

```text
/dashboard
```

### Header

```text
Dashboard
Overview of NDT inspection activities
```

### Summary cards

Minimal 4:

```text
Total Inspection
ACC
REJECT
Total Indication
```

Contoh:

```text
┌────────────────┐
│ TOTAL INSPECTION│
│ 128             │
└────────────────┘

┌────────────────┐
│ ACC             │
│ 112             │
└────────────────┘

┌────────────────┐
│ REJECT          │
│ 16              │
└────────────────┘

┌────────────────┐
│ INDICATION      │
│ 542             │
└────────────────┘
```

### Recent Inspection

Tabel 5–10 data terbaru.

Columns:

- Inspection ID
- Date
- Component
- Zone
- `% Unbound`
- Result
- Action

Action:

**View**

### CTA

```text
[ + New Inspection ]
```

---

# 10. New Inspection Page

Route:

```text
/inspection/new
```

Ini adalah halaman terpenting.

## Layout

Split-screen:

```text
┌───────────────────┬────────────────────────────────────┐
│ Inspection Data   │ 2D Inspection Mapping              │
│                   │                                    │
│ Component         │ Toolbar                            │
│ Diameter          │                                    │
│ Length            │ ┌────────────────────────────────┐ │
│ Zone              │ │                                │ │
│                   │ │      Technical Drawing         │ │
│ Drawing           │ │                                │ │
│ Upload            │ │       ①        ②              │ │
│                   │ │                    ③           │ │
│ Result            │ │                                │ │
│                   │ └────────────────────────────────┘ │
│ % Unbound         │                                    │
│ Acceptance        │ Indication Details                 │
│                   │                                    │
│ ACC / REJECT      │ Table                              │
└───────────────────┴────────────────────────────────────┘
```

---

# 11. Inspection Form

Fields:

### Component Information

- Component Type
- Diameter
- Length
- Inspection Zone

### Drawing

- Upload image
- Replace image
- Remove image

Accepted format:

- PNG
- JPG
- JPEG

Frontend validation:
- File type
- File size
- Image preview

---

# 12. Mapping Canvas

Use:

**React-Konva**

Canvas features:

- Display uploaded drawing
- Click to add indication
- Move marker
- Select marker
- Delete marker
- Zoom in
- Zoom out
- Fit to screen
- Reset view

### Marker

Each indication receives sequential number:

```text
01
02
03
...
```

Marker should be visually small agar tidak menutupi drawing.

### Marker states

- Default
- Hover
- Selected
- Error/invalid

Selected marker should highlight corresponding table row.

---

# 13. Add Indication Modal

Saat user klik drawing:

```text
Add Indication

Coordinate
X: 320
Y: 180

Length
[ 12.50 ] mm

Width
[ 4.20 ] mm

Area
5.25 mm²

[ Cancel ] [ Add Indication ]
```

Area dihitung otomatis:

```text
Area = Length × Width
```

Jangan meminta user memasukkan area secara manual.

---

# 14. Calculation Panel

Setiap marker ditambahkan:

```text
Total Indications
12

Total Unbound Area
1,245.50 mm²

Unbound Percentage
4.82 %

Acceptance Criteria
≤ 5.00 %
```

Perhitungan dilakukan secara real-time.

---

# 15. Evaluation Result

Jika memenuhi kriteria:

```text
┌────────────────────────┐
│ ✓                      │
│ ACC                    │
│ Within Acceptance      │
│ Criteria               │
└────────────────────────┘
```

Jika melebihi:

```text
┌────────────────────────┐
│ !                      │
│ REJECT                 │
│ Exceeds Acceptance     │
│ Criteria               │
└────────────────────────┘
```

Status jangan dihitung berdasarkan warna saja. Gunakan teks + icon.

---

# 16. Indication Table

Columns:

```text
No
X
Y
Length
Width
Area
Action
```

Action:

- Edit
- Delete

Interaksi:

```text
Click Marker
      ↓
Highlight Table Row

Click Table Row
      ↓
Highlight Marker
```

---

# 17. Save Inspection

Karena Draft ditunda, jangan membuat status Draft.

Gunakan tombol:

```text
[ Cancel ]       [ Save Inspection ]
```

Setelah berhasil:

```text
Inspection saved successfully.
```

Kemudian user dapat diarahkan ke:

```text
/inspection/:id
```

---

# 18. Inspection History

Route:

```text
/inspection/history
```

### Header

```text
Inspection History
View and manage completed inspections
```

### Search

```text
[ Search Inspection ID / Component... ]
```

### Filter

- Date
- Component
- Zone
- Result

### Table

Columns:

| Column |
|---|
| Inspection ID |
| Date |
| Component |
| Zone |
| % Unbound |
| Result |
| Inspector |
| Action |

Action:

```text
[ View ]
```

Optional later:

```text
[ Export PDF ]
```

---

# 19. Inspection Detail

Route:

```text
/inspection/:id
```

Sections:

1. Inspection Information
2. Technical Drawing
3. Indication Details
4. Calculation
5. Acceptance Criteria
6. Final Result

Header:

```text
← Back to History

Inspection Detail

NDT-2026-00124

[ Export PDF ]
```

---

# 20. PDF Export UI

Frontend menggunakan:

- jsPDF
- html2canvas

PDF harus memuat:

1. PLN/application branding
2. Inspection ID
3. Date
4. Inspector
5. Component information
6. Inspection zone
7. Technical drawing
8. Drawing dengan marker
9. Indication table
10. Total Unbound Area
11. `% Unbound`
12. Acceptance Criteria
13. ACC/REJECT

---

# 21. State Management

Gunakan:

**Redux Toolkit**

Recommended slices:

```text
authSlice
inspectionSlice
indicationSlice
uiSlice
```

### authSlice

```text
user
isAuthenticated
loading
error
```

### inspectionSlice

```text
inspectionId
componentType
diameter
length
zone
drawing
acceptanceCriteria
result
```

### indicationSlice

```text
indications[]
selectedIndicationId
```

### uiSlice

```text
sidebarOpen
modal
toast
loading
```

---

# 22. Suggested Folder Structure

```text
src/
│
├── assets/
│   ├── images/
│   │   └── pln-logo.png
│   └── icons/
│
├── components/
│   ├── common/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Badge/
│   │   ├── Toast/
│   │   └── Loading/
│   │
│   ├── layout/
│   │   ├── AppLayout/
│   │   ├── Sidebar/
│   │   └── Header/
│   │
│   ├── dashboard/
│   │   ├── SummaryCard/
│   │   └── RecentInspectionTable/
│   │
│   ├── inspection/
│   │   ├── InspectionForm/
│   │   ├── DrawingUploader/
│   │   ├── InspectionCanvas/
│   │   ├── CanvasToolbar/
│   │   ├── IndicationModal/
│   │   ├── IndicationTable/
│   │   ├── CalculationSummary/
│   │   └── EvaluationResult/
│   │
│   └── history/
│       ├── HistoryFilter/
│       └── HistoryTable/
│
├── pages/
│   ├── Login/
│   │   └── LoginPage.tsx
│   ├── Dashboard/
│   │   └── DashboardPage.tsx
│   └── Inspection/
│       ├── NewInspectionPage.tsx
│       ├── InspectionHistoryPage.tsx
│       └── InspectionDetailPage.tsx
│
├── store/
│   ├── index.ts
│   └── slices/
│       ├── authSlice.ts
│       ├── inspectionSlice.ts
│       ├── indicationSlice.ts
│       └── uiSlice.ts
│
├── routes/
│   └── AppRoutes.tsx
│
├── services/
│   └── api.ts
│
├── types/
│   ├── auth.ts
│   ├── inspection.ts
│   └── indication.ts
│
├── utils/
│   ├── calculation.ts
│   ├── validation.ts
│   └── pdf.ts
│
├── styles/
│   ├── variables.css
│   └── global.css
│
├── App.tsx
└── main.tsx
```

---

# 23. Routes

```text
/login

/dashboard

/inspection/new

/inspection/history

/inspection/:id
```

Protected routes:

```text
/dashboard
/inspection/new
/inspection/history
/inspection/:id
```

Public route:

```text
/login
```

---

# 24. Frontend Dependencies

Core:

```bash
npm install react-router-dom
npm install @reduxjs/toolkit react-redux
npm install react-konva konva
npm install @tanstack/react-table
npm install react-bootstrap bootstrap
npm install @tabler/icons-react
npm install jspdf html2canvas
```

Development:

```bash
npm install -D typescript
```

---

# 25. Calculation Utility

Calculation logic harus dipisahkan dari UI.

Example:

```text
calculateIndicationArea(length, width)

calculateTotalUnboundArea(indications)

calculateUnboundPercentage(totalUnboundArea, componentArea)

evaluateAcceptance(unboundPercentage, acceptanceCriteria)
```

Frontend hanya menampilkan hasil dari utility tersebut.

---

# 26. UX Rules

### Loading

Gunakan skeleton/spinner pada:
- Dashboard
- History
- Detail
- Login

### Empty State

History kosong:

```text
No inspections found.

Start your first inspection.

[ + New Inspection ]
```

### Error

Gunakan toast atau inline error.

### Confirmation

Delete indication:

```text
Delete indication 03?

[ Cancel ] [ Delete ]
```

---

# 27. Responsive Behavior

Prioritas:

**Desktop > Tablet > Mobile**

Karena mapping membutuhkan canvas besar.

Desktop:

```text
Sidebar + Split Workspace
```

Tablet:

```text
Sidebar collapsed
Form + Canvas stacked
```

Mobile:

```text
Single column
Canvas first/second sesuai workflow
```

Namun mobile bukan target utama untuk proses inspeksi.

---

# 28. Accessibility

Minimal:

- Kontras warna yang cukup
- Semua input memiliki label
- Button memiliki text/icon yang jelas
- Jangan menggunakan warna sebagai satu-satunya indikator
- Keyboard focus state
- Modal dapat ditutup dengan keyboard
- Table dapat dibaca dengan screen reader

---

# 29. Frontend Development Priority

Kerjakan dalam urutan:

### Phase 1 — Foundation

- Vite + React + TypeScript
- Bootstrap
- Theme/color variables
- Routing
- Global layout

### Phase 2 — Authentication UI

- Login
- Protected route
- Logout state

### Phase 3 — Dashboard

- Summary cards
- Recent inspection table

### Phase 4 — Inspection Workspace

- Form
- Upload drawing
- React-Konva
- Marker
- Add indication modal
- Indication table

### Phase 5 — Calculation

- Area calculation
- Total area
- `% Unbound`
- Acceptance Criteria
- ACC/REJECT

### Phase 6 — History

- Search
- Filter
- Table
- Detail navigation

### Phase 7 — Report

- Detail page
- PDF export

---

# 30. Important Frontend Principle

Jangan membuat semua logika langsung di dalam component.

Hindari:

```text
InspectionPage.tsx
└── 1500+ lines
```

Pisahkan menjadi:

```text
InspectionPage
├── InspectionForm
├── DrawingUploader
├── InspectionCanvas
├── CanvasToolbar
├── IndicationModal
├── IndicationTable
├── CalculationSummary
└── EvaluationResult
```

Ini akan sangat membantu ketika backend mulai dibuat.

---

# 31. Final Page Architecture

```text
                 LOGIN
                   │
                   ▼
               DASHBOARD
              /          \
             /            \
            ▼              ▼
    NEW INSPECTION      HISTORY
            │              │
            │              ▼
            │        INSPECTION DETAIL
            │              │
            └──────────────┘
                   │
                   ▼
               EXPORT PDF
```

## Scope V1

```text
✓ Login
✓ Dashboard
✓ New Inspection
✓ 2D Mapping
✓ Indication Management
✓ Real-time Calculation
✓ ACC / REJECT
✓ Inspection History
✓ Inspection Detail
✓ PDF Export

✗ Draft
✗ Advanced User Roles
✗ Backend
✗ Database
✗ Audit Trail
✗ Advanced Settings
```

Status **Draft sengaja tidak dimasukkan** sesuai keputusan saat ini. Backend/database juga belum menjadi fokus; struktur frontend dibuat agar nantinya mudah dihubungkan ke API.

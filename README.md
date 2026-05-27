# Beam · 2D Structural Analysis

โปรแกรมวิเคราะห์โครงสร้างคาน 2 มิติ (2D beam analysis) บนเว็บ พัฒนาด้วย **React + Vite**
ใช้วิธี **Finite Element (Direct Stiffness Method)** บนพื้นฐานทฤษฎีคาน Euler–Bernoulli
ออกแบบ UI/UX อ้างอิงจาก [eaglei.tech/beam](https://eaglei.tech/beam/)

> ป้อนคุณสมบัติคาน → กด **Generate Model** → กด **Run Analysis** → ดู SFD / BMD / Deflection

---

## ✨ ความสามารถ (Features)

### ประเภทคาน (Beam Types)
| ชนิด | จุดรองรับ | สถานะ |
|---|---|---|
| Simply Supported | Pin + Roller | Determinate |
| Left Cantilever | Fixed (ซ้าย) | Determinate |
| Right Cantilever | Fixed (ขวา) | Determinate |
| Continuous | Pin + Roller + Roller (2 ช่วงเท่ากัน) | Indeterminate |

### ชนิดแรงกระทำ (Load Types)
- **UDL** — แรงแผ่สม่ำเสมอเต็มช่วง (kN/m)
- **Partial UDL** — แรงแผ่บางส่วน (กำหนด Left/Right Offset)
- **Point Load** — แรงกระทำเป็นจุด (kN)
- **Point Moment** — โมเมนต์กระทำเป็นจุด (kN·m)

### กรณีและการรวมแรง (Load Cases & Combinations)
- **Load Cases:** Dead Load (DL), Live Load (LL)
- **Combinations:** `COMBO1 = 1.4 DL` · `COMBO2 = 1.2 DL + 1.6 LL`

### วัสดุและหน้าตัด (Materials & Sections)
- **Materials:** Concrete / Steel (มี library, grade, ค่า f′c / E / density)
- **Sections:** Rectangular, T-Section, I-Section (คำนวณ A และ I อัตโนมัติ)

### ผลลัพธ์ (Outputs)
- ปฏิกิริยาที่จุดรองรับ (Reactions)
- **SFD** — Shear Force Diagram
- **BMD** — Bending Moment Diagram
- **Deflection Diagram** — การโก่งตัว
- ตารางสรุปค่าสูงสุด/ต่ำสุดพร้อมตำแหน่ง

---

## 🧮 วิธีการคำนวณ (Solver Methodology)

ไฟล์ [`src/utils/beamSolver.js`](src/utils/beamSolver.js)

- **Euler–Bernoulli beam element** (2 DOF ต่อ node: การเคลื่อนที่แนวดิ่ง `v` และการหมุน `θ`)
- แบ่งคานเป็น **100 element ต่อช่วง** เพื่อให้กราฟต่อเนื่องเรียบ
- Element stiffness matrix:
  ```
  k = EI/L³ · ⎡ 12   6L  -12   6L ⎤
              ⎢ 6L  4L² -6L  2L² ⎥
              ⎢-12  -6L  12  -6L ⎥
              ⎣ 6L  2L² -6L  4L² ⎦
  ```
- **Fixed-End Forces (FEF)** สำหรับ UDL / partial UDL / point load / point moment
- **Boundary conditions** ด้วยวิธี penalty
- **Reaction recovery:**
  - คาน determinate → สูตร analytical (สมดุลสถิตยศาสตร์)
  - คาน continuous (indeterminate) → ดึงจากผล FEM โดยตรง (residual: `R = F₀ − K·u`)
- **SFD / BMD** จาก equilibrium integration ใช้ **left-limit rule** ที่จุดรองรับเพื่อจับค่า peak ให้ถูกต้อง

---

## ✅ การตรวจสอบความถูกต้อง (Verification)

ตรวจสอบ **37 เคส ผ่าน 37/37** เทียบกับสูตรปิด (closed-form) และสมดุลสถิตยศาสตร์
ครอบคลุมคานทุกประเภท × แรงทุกชนิด × load combinations × section properties

| กรณี (UDL = 20 kN/m, L = 6 m, คอนกรีต 4000 psi) | ผลที่ได้ | สูตรทฤษฎี |
|---|---|---|
| Simply-supported · Mmax | 90.00 kN·m | wL²/8 |
| Simply-supported · δmax | 4.345 mm | 5wL⁴/384EI |
| Cantilever · Mmax (ฐานยึด) | −360 kN·m | wL²/2 |
| Cantilever · δmax (ปลาย) | 41.71 mm | wL⁴/8EI |
| Continuous · M ที่ support กลาง | −22.5 kN·m | −wLs²/8 |
| Continuous · δmax | 0.113 mm | ≈ wLs⁴/185EI |
| Point P=50 @ center · δmax | 2.897 mm | PL³/48EI |
| Cantilever · point @ tip · δmax | 46.35 mm | PL³/3EI |

> ทุกค่ามี error ≈ 0.00% เทียบกับทฤษฎี

---

## 🚀 การติดตั้งและใช้งาน (Getting Started)

ต้องมี **Node.js 18+**

```bash
# ติดตั้ง dependencies
npm install

# รัน dev server (http://localhost:5173)
npm run dev

# build สำหรับ production
npm run build

# ดูตัวอย่าง build
npm run preview
```

---

## 🖥️ โครงสร้าง UI

- **แถบบน:** โลโก้ · แท็บ Project / Preferences · แท็บ Model / Report · ปุ่ม Analyze / Generate Model
- **Sidebar (Project):** Project Information · Beam Type · Material · Section · Loads (DL/LL) · ตารางโมเดลหลัง Generate
- **Sidebar (Preferences):** Units & Code · Display (precision, grid, diagram fill) · About
- **พื้นที่หลัก:** มุมมองคาน (pan/zoom) หรือ Diagrams (SFD/BMD/Deflection + ตารางสรุป)

---

## 🗂️ โครงสร้างโปรเจกต์ (Project Structure)

```
2D_Analysis/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx                  # state หลัก + layout
    ├── index.css                # design system (Tailwind + custom)
    ├── utils/
    │   ├── beamSolver.js        # FEM solver (Euler–Bernoulli)
    │   └── materials.js         # ฐานข้อมูลวัสดุ
    └── components/
        ├── Header.jsx           # แถบนำทางบน
        ├── Sidebar.jsx          # พาเนล input + Preferences
        ├── BeamViewer.jsx       # วาดคาน/แรง/จุดรองรับ (SVG)
        └── DiagramViewer.jsx    # SFD / BMD / Deflection (SVG)
```

---

## 🛠️ เทคโนโลยี (Tech Stack)

- **React 18** + **Vite 5**
- **Tailwind CSS 3** + custom design system (โทน teal/petrol, ฟอนต์ Inter)
- **SVG** สำหรับวาดคานและไดอะแกรมทั้งหมด (ไม่พึ่ง charting library)
- Custom **FEM solver** เขียนด้วย JavaScript ล้วน

---

## 📌 ข้อจำกัดและแผนพัฒนา (Notes / Roadmap)

- คาน continuous ปัจจุบันรองรับ 2 ช่วงเท่ากัน
- ยังไม่รวมน้ำหนักตัวเอง (self-weight) อัตโนมัติ
- หน่วยรองรับระบบ SI / Metric

---

🤖 พัฒนาร่วมกับ [Claude Code](https://claude.com/claude-code)

# English in Daily Life (EDL) — practice site

Part of **Surin English Hub** (`surin-english-hub.github.io/edl`). Static site for GitHub Pages. No build step.

## คู่มือผู้ดูแล (Admin guide)

### โครงสร้าง
| Path | What it is |
|---|---|
| `index.html` | Course home: week cards (from `data/weeks.json`) |
| `week.html?w=02` | One week page, built from `data/week02.json` |
| `data/weeks.json` | Week list + status: `open`, `done`, `soon`, `test`, `exam` |
| `data/weekNN.json` | Content of one week (words, listening, practice, speaking) |
| `audio/` | MP3 files, e.g. `w02_scriptA_slow.mp3`, `w02_scriptA_normal.mp3` |
| `img/` | WebP images, ≤ 200 KB each, e.g. `w02_ploy_profile.webp` |
| `assets/js/config.js` | Sections, student-ID format, quiz back-end URL (Phase B) |
| `privacy.html`, `help.html` | Privacy notice and how-to page (EN + TH) |

### เปิดบทเรียนสัปดาห์ใหม่
1. เพิ่มไฟล์ `data/weekNN.json` (คัดลอกจาก `week02.json` แล้วแก้เนื้อหา) — Claude สร้างให้จาก handout และ L&S pack
2. อัปโหลดไฟล์เสียงไปที่ `audio/` และภาพไปที่ `img/` ให้ชื่อตรงกับใน JSON
3. แก้ `data/weeks.json` เปลี่ยน `"status": "soon"` เป็น `"open"`
4. Commit แล้วรอ 1–2 นาที

ไม่ต้องแก้โค้ดใด ๆ

### แปลงไฟล์เสียงก่อนอัปโหลด (mono, 64 kbps, < 1 MB)
```
ffmpeg -i input.mp3 -ac 1 -b:a 64k w02_scriptA_normal.mp3
```

### ประเภทแบบฝึกใน JSON
| type | ใช้ทำอะไร | ฟิลด์ |
|---|---|---|
| `mc` | เลือกคำตอบ | `q`, `options`, `answer` (index เริ่มที่ 0), `why` / `fbOk` / `fbNo` |
| `tf` | จริง/ไม่จริง | `q`, `answer` (true/false), `why` |
| `gap` | เติมคำจากคลังคำ | `q` (ใช้ `___`), `answer`, `bank` |
| `order` | เรียงคำเป็นประโยค | `answer`, `words` (ลำดับที่แสดง), `qTh` |

ใช้ `**คำ**` เพื่อทำตัวหนา (เช่น คำที่ลงเสียงหนักใน shadowing)

## ⚠️ Safeguards — ห้ามข้ามเด็ดขาด
- Repo นี้เป็น **สาธารณะ** ทุกไฟล์ใครก็เปิดดูได้ (รวมถึงประวัติ commit เก่า)
- **ห้าม** ใส่: เฉลย quiz ที่เก็บคะแนน, Script B (ใช้กับ quiz สอบแทน), รายชื่อนักศึกษา, ไฟล์คะแนน
- ไฟล์ที่ห้ามอยู่ใน repo ถูกกันไว้ใน `.gitignore` แล้ว แต่ให้ตรวจทุกครั้งก่อน commit
- คะแนนและรายชื่อเก็บใน Google Sheets ของอาจารย์ (`EDL_2026/_Private/`) แชร์ให้อาจารย์คนเดียว
- การฝึกบนเว็บบันทึกในเครื่องนักศึกษาเท่านั้น ไม่ส่งข้อมูลไปที่ใด
- เสียง Mark และ Script B ทำด้วย edge-tts — ก่อนเปิดใช้จริง ตรวจเงื่อนไขการเผยแพร่ หรือสร้างใหม่ด้วยแพ็กเกจ ElevenLabs ที่มีสิทธิ์

# ADR-005: Quranic Reciters

## Status: Accepted

## Date: 2025-06-04

## Context

Using a single reciter (Husary) gets monotonous. The student benefits from hearing different voices — it trains the ear and keeps engagement high. Reciters should be **clear**, **not too fast**, and suitable for learners.

Siraj tested all candidates on [tanzil.net/#5:110](https://tanzil.net/#5:110) and approved this list.

## Decision

### Approved Reciter Pool (randomly pick per phrase)

| # | Reciter | EveryAyah Folder | Bitrate | Notes |
|---|---------|-----------------|---------|-------|
| 1 | **Mahmoud Khalil Al-Husary** | `Husary_128kbps` | 128kbps | Classic, deliberate. Previously the only reciter used. |
| 2 | **Abdul Basit (Mujawwad)** | `Abdul_Basit_Mujawwad_128kbps` | 128kbps | Melodic/ornamental style |
| 3 | **Abdul Basit (Murattal)** | `Abdul_Basit_Murattal_192kbps` | 192kbps | Plain recitation, highest audio quality |
| 4 | **Mishary Rashid Alafasy** | `Alafasy_128kbps` | 128kbps | Modern, crystal-clear, beloved worldwide |
| 5 | **Ali Al-Hudhaifi** | `Hudhaify_128kbps` | 128kbps | Madinah imam, very measured tajweed |
| 6 | **Saad Al-Ghamdi** | `Ghamadi_40kbps` | 40kbps | Clear and moderate pace (low bitrate) |
| 7 | **Abdullaah Al-Juhainy** | `Abdullaah_3awwaad_Al-Juhaynee_128kbps` | 128kbps | |
| 8 | **Maher Al-Muaiqly** | `MaherAlMuaiqly128kbps` | 128kbps | Imam of Haram |
| 9 | **Hani Ar-Rifai** | `Hani_Rifai_192kbps` | 192kbps | |
| 10 | **Abdurrahman As-Sudais** | `Abdurrahmaan_As-Sudais_192kbps` | 192kbps | Imam of Haram |
| 11 | **Abu Bakr Ash-Shatri** | `Abu_Bakr_Ash-Shaatree_128kbps` | 128kbps | |

### URL Pattern
```
https://everyayah.com/data/{FOLDER_NAME}/{SSS}{AAA}.mp3
```
Example: `https://everyayah.com/data/Alafasy_128kbps/005110.mp3`

### How to Use
- For each phrase in a lesson, randomly assign a reciter from this pool
- Ensure no two consecutive phrases use the same reciter
- When rebuilding audio, the build script should accept a reciter parameter or pick randomly

### English TTS Voice
Switch from `en-US-AvaNeural` (female) to male voice pool:
- `en-US-AndrewNeural` — warm, confident
- `en-US-BrianNeural` — approachable, casual
- `en-US-ChristopherNeural` — reliable, authoritative

Rotate randomly (already implemented in `generate-tts.sh` and `generate-tts-batch.py`, needs to be applied to `build-lesson-audio.py`).

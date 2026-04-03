# ADR-005: Quranic Reciters

## Status: Accepted

## Date: 2025-06-04

## Context

Using a single reciter (Husary) gets monotonous. The student benefits from hearing different voices — it trains the ear and keeps engagement high. Reciters should be **clear**, **not too fast**, and suitable for learners.

Siraj tested all candidates on [tanzil.net/#5:110](https://tanzil.net/#5:110) and approved this list.

## Decision

### Approved Reciter Pool (one per phrase, matched by segment length)

| # | Reciter | EveryAyah Folder | Bitrate | Speed | Best for |
|---|---------|-----------------|---------|-------|----------|
| 1 | **Mahmoud Khalil Al-Husary** | `Husary_128kbps` | 128kbps | 🐢 Slow | Short segments |
| 2 | **Abdul Basit (Mujawwad)** | `Abdul_Basit_Mujawwad_128kbps` | 128kbps | 🐢 Slow | Short segments (melodic) |
| 3 | **Abdul Basit (Murattal)** | `Abdul_Basit_Murattal_192kbps` | 192kbps | 🐢 Slow | Short segments |
| 4 | **Hani Ar-Rifai** | `Hani_Rifai_192kbps` | 192kbps | 🐢 Slow | Short segments |
| 5 | **Ali Al-Hudhaifi** | `Hudhaify_128kbps` | 128kbps | 🚶 Moderate | Short–medium segments |
| 6 | **Mishary Rashid Alafasy** | `Alafasy_128kbps` | 128kbps | 🚶 Moderate | Medium segments |
| 7 | **Abu Bakr Ash-Shatri** | `Abu_Bakr_Ash-Shaatree_128kbps` | 128kbps | 🚶 Moderate | Medium segments |
| 8 | **Abdullaah Al-Juhainy** | `Abdullaah_3awwaad_Al-Juhaynee_128kbps` | 128kbps | 🏃 Faster | Longer segments |
| 9 | **Maher Al-Muaiqly** | `MaherAlMuaiqly128kbps` | 128kbps | 🏃 Faster | Longer segments |
| 10 | **Saad Al-Ghamdi** | `Ghamadi_40kbps` | 40kbps | 🏃 Faster | Longer segments (low bitrate) |
| 11 | **Abdurrahman As-Sudais** | `Abdurrahmaan_As-Sudais_192kbps` | 192kbps | 🏃 Faster | Longer segments |
| 12 | **Yasser Ad-Dussary** ⭐ | `Yasser_Ad-Dussary_128kbps` | 128kbps | 🏃 Faster | Longer segments (Siraj's favourite) |

### Speed matching rule
- **Short segments** (≤5 words): assign slow reciters — their deliberate pace makes short phrases feel complete
- **Medium segments** (6–10 words): assign moderate reciters
- **Longer segments** (11+ words): assign faster reciters — keeps the audio from dragging

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

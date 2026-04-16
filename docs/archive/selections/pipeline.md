> **Status (2026-04-17):** Archived. Era-1 lesson-authoring workflow; superseded by [PRD §5.F1-F4](../../PRD.md) and the InstantDB picker. Content preserved for historical reference.

# Sentence Pipeline

Single source of truth for verses queued for future lessons. The future agent should **check this file first** before pulling fresh from the corpus.

---

## Ready to Place

Verses already approved by the teacher, assigned to a specific future lesson or context.

*(Empty — 3:18 was used in Lesson 2 as Learning phrase 1.)*

---

## Dropped from Lesson 2 → available for future lessons

Verses that were seriously considered for Lesson 2 but moved to pipeline during selection. See `docs/roots/shahida.json` for full scoring and metadata.

| Ref | Arabic (key part) | Root word | Form | Why deferred | Flagged in |
|-----|-------------------|-----------|------|-------------|------------|
| 12:26 | وَ**شَهِدَ** **شَاهِدٌ** مِّنْ أَهْلِهَا | شَهِدَ | شَهِدَ + شَاهِد | Yusuf story — initially picked for Learning but Learning already had enough شَاهِد coverage. HIGH priority for future Learning/Recall. | Lesson 2 |
| 36:65 | وَ**تَشْهَدُ** أَرْجُلُهُم بِمَا كَانُوا۟ يَكْسِبُونَ | شَهِدَ | تَشْهَدُ | Surah Yasin — frequently recited. Considered for Learning 5 but teacher preferred 5:117 (ʿĪsā). HIGH priority for Lesson 3+ Learning. | Lesson 2 |
| 22:17 | إِنَّ ٱللَّهَ عَلَىٰ كُلِّ شَىْءٍ **شَهِيدٌ** | شَهِدَ | شَهِيد | Short declarative — saved for future Learning. | Lesson 2 |
| 3:98 | وَٱللَّهُ **شَهِيدٌ** عَلَىٰ مَا تَعْمَلُونَ | شَهِدَ | شَهِيد | Parallel to 22:17. Short warning. | Lesson 2 |
| 7:172 | وَ**أَشْهَدَهُمْ** عَلَىٰٓ أَنفُسِهِمْ ... بَلَىٰ **شَهِدْنَا** | شَهِدَ | أَشْهَدَ (Form IV) | Primordial covenant verse. Introduces Form IV. Teacher preferred 5:117 as Learning 5. **HIGHEST-priority future Learning** — it's the only verse that introduces Form IV alongside a new 1st-person conjugation. | Lesson 2 |

---

## Previously Used — Dropped from Lesson 1 v2

These were live in Lesson 1 v1 (fully tested with a student). Dropped during the v2 restructure (20 → 12 phrases). All have audio already downloaded for 11 reciters. **High priority for reuse** — they're battle-tested.

| Ref | Arabic (key part) | Root word | Form | Original explanation | Why dropped | Flagged in |
|-----|-------------------|-----------|------|---------------------|------------|------------|
| 21:87 | لَّا **إِلَٰهَ** إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ | إِلَٰه | لَا إِلَٰهَ إِلَّا | Story of Yūnus in the whale — one of the most beloved duʿās. The phrase لَا إِلَٰهَ إِلَّا — "there is no god but…" — is the heart of tawḥīd. | Too long for a beginner's first phrase. Student found it overwhelming. | Lesson 1 v1 |
| 7:59 | يَا قَوْمِ اعْبُدُوا اللَّهَ مَا لَكُم مِّنْ **إِلَٰهٍ** غَيْرُهُ | إِلَٰه | إِلَٰهٍ غَيْرُهُ | Nūḥ's call — the same words repeated by every prophet. Every prophet in the Qur'an says this exact phrase: مَا لَكُم مِّنْ إِلَٰهٍ غَيْرُهُ. | Pattern dropped from v2 table. | Lesson 1 v1 |
| 114:1–3 | قُلْ أَعُوذُ بِرَبِّ النَّاسِ · مَلِكِ النَّاسِ · **إِلَٰهِ** النَّاسِ | إِلَٰه | إِلَٰهِ النَّاسِ | Surah An-Nās — you recite this every day in ṣalāh and before sleep. | Pattern dropped from v2 table. Could revisit in a surah-based lesson. | Lesson 1 v1 |
| 47:19 | فَاعْلَمْ أَنَّهُ لَا **إِلَٰهَ** إِلَّا اللَّهُ وَاسْتَغْفِرْ لِذَنبِكَ | إِلَٰه | لَا إِلَٰهَ إِلَّا | A direct command to the Prophet ﷺ — often cited as the most concise statement of tawḥīd and istighfār in one breath. | Slot went to shorter phrases. | Lesson 1 v1 |
| 18:110 | قُلْ إِنَّمَا أَنَا بَشَرٌ مِّثْلُكُمْ يُوحَىٰ إِلَيَّ أَنَّمَا **إِلَٰهُكُمْ** **إِلَٰهٌ** وَاحِدٌ | إِلَٰه | إِلَٰهٌ وَاحِدٌ | The closing words of Surah Al-Kahf — recited every Friday. A powerful ending you already hear weekly. | Too long. Pattern dropped from v2 table. | Lesson 1 v1 |
| 7:138 | قَالُوا يَا مُوسَى اجْعَل لَّنَا **إِلَٰهًا** كَمَا لَهُمْ **آلِهَةٌ** | إِلَٰه | آلِهَة + إِلَٰه | The Israelites' shocking request — right after being saved from Pharaoh, they pass by idol-worshippers and immediately ask for the same thing. Has both singular and plural in one phrase. | Replaced by shorter 6:74 fragment for آلِهَة. | Lesson 1 v1 |
| 28:38 | وَقَالَ فِرْعَوْنُ... مَا عَلِمْتُ لَكُم مِّنْ **إِلَٰهٍ** غَيْرِي | إِلَٰه | إِلَٰهٍ غَيْرِي | The anti-version of Nūḥ's call. Every prophet said مَا لَكُم مِّنْ إِلَٰهٍ غَيْرُهُ — Pharaoh flips it: مَا عَلِمْتُ لَكُم مِّنْ إِلَٰهٍ غَيْرِي. Same words, ultimate arrogance. | Very long. Pattern dropped from v2 table. | Lesson 1 v1 |
| 6:78 | فَلَمَّا رَأَى الشَّمْسَ بَازِغَةً قَالَ هَٰذَا رَبِّي هَٰذَا **أَكْبَرُ** | كَبُرَ | أَكْبَر | Story of Ibrāhīm searching for God — stars, moon, sun. Each time "this is greater" — until they all set and he turns to the One who never sets. | Already have أَكْبَر in anchor phrase and learning (29:45). | Lesson 1 v1 |
| 2:219 | يَسْأَلُونَكَ عَنِ الْخَمْرِ وَالْمَيْسِرِ... إِثْمٌ **كَبِيرٌ**... **أَكْبَرُ** مِن نَّفْعِهِمَا | كَبُرَ | كَبِير + أَكْبَر | The famous ruling verse on wine and gambling. Uses both كَبِير and أَكْبَر — two forms from the same root in one sentence. | Very long. Both forms already covered elsewhere. | Lesson 1 v1 |
| 87:12 | الَّذِي يَصْلَى النَّارَ **الْكُبْرَىٰ** | كَبُرَ | كُبْرَى | From Surah Al-A'lā — one of the most frequently recited surahs in ṣalāh. You already know this by ear. | كُبْرَى already covered by 79:20 in learning. | Lesson 1 v1 |

### Hadith dropped from Lesson 1 v2

| Title | Arabic | Root words | Original explanation | Why dropped | Flagged in |
|-------|--------|------------|---------------------|------------|------------|
| Words Beloved to Allah (Muslim) | أَحَبُّ الْكَلَامِ إِلَى اللَّهِ أَرْبَعٌ: سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللهُ أَكْبَرُ | إِلَٰه + كَبُرَ | Bridges both root words from the lesson — لَا إِلَٰهَ إِلَّا اللّٰه and اللهُ أَكْبَرُ together in one sentence. | Hadith section dropped entirely in v2 restructure. | Lesson 1 v1 |

---

## Strong Candidates

Verses flagged as good but not yet assigned to a specific lesson. Pick these when a slot opens.

| Ref | Arabic Context | Root word | Pattern / Form | Reason | Flagged in |
|-----|---------------|-----------|---------------|--------|------------|
| 40:35 | **كَبُرَ** مَقْتًا عِندَ اللَّهِ وَعِندَ الَّذِينَ آمَنُوا | كَبُرَ | كَبُرَ (Form I) | Nearly identical to 61:3 — same phrase, different context | Lesson 1 |
| 9:72 | وَرِضْوَانٌ مِّنَ اللَّهِ **أَكْبَرُ** ۚ ذَٰلِكَ هُوَ الْفَوْزُ الْعَظِيمُ | كَبُرَ | أَكْبَر | Allah's pleasure is greater — Surah At-Tawbah | Lesson 1 |
| 40:57 | لَخَلْقُ السَّمَاوَاتِ وَالْأَرْضِ **أَكْبَرُ** مِنْ خَلْقِ النَّاسِ | كَبُرَ | أَكْبَر | Heavens and earth greater than mankind — mind-expanding | Lesson 1 |
| 6:19 | قُلْ أَيُّ شَيْءٍ **أَكْبَرُ** شَهَادَةً ۖ قُلِ اللَّهُ | كَبُرَ | أَكْبَر | "What is greatest as testimony?" — rhetorical, powerful | Lesson 1 |
| 2:219 | وَإِثْمُهُمَا **أَكْبَرُ** مِن نَّفْعِهِمَا | كَبُرَ | أَكْبَر | Sin greater than benefit — wine/gambling (same verse as كَبِير Learning) | Lesson 1 |
| 13:9 | عَالِمُ الْغَيْبِ وَالشَّهَادَةِ **الْكَبِيرُ** الْمُتَعَالِ | كَبُرَ | كَبِير | Two Names of Allah side by side | Lesson 1 |
| 17:31 | إِنَّ قَتْلَهُمْ كَانَ خِطْئًا **كَبِيرًا** | كَبُرَ | كَبِير | Killing children — powerful moral weight | Lesson 1 |
| 11:11 | أُولَٰئِكَ لَهُم مَّغْفِرَةٌ وَأَجْرٌ **كَبِيرٌ** | كَبُرَ | كَبِير | Forgiveness and great reward — hopeful | Lesson 1 |
| 22:62 | وَأَنَّ اللَّهَ هُوَ الْعَلِيُّ **الْكَبِيرُ** | كَبُرَ | كَبِير | Name of Allah — الْعَلِيُّ الْكَبِيرُ | Lesson 1 |
| 54:53 | وَكُلُّ صَغِيرٍ وَ**كَبِيرٍ** مُّسْتَطَرٌ | كَبُرَ | كَبِير | Small and great — nothing escapes the Record | Lesson 1 |
| 53:18 | لَقَدْ رَأَىٰ مِنْ آيَاتِ رَبِّهِ **الْكُبْرَىٰ** | كَبُرَ | كُبْرَى | Night Journey — greatest signs of his Lord | Lesson 1 |
| 79:34 | فَإِذَا جَاءَتِ الطَّامَّةُ **الْكُبْرَىٰ** | كَبُرَ | كُبْرَى | The greatest overwhelming calamity — Day of Judgment | Lesson 1 |
| 44:16 | يَوْمَ نَبْطِشُ الْبَطْشَةَ **الْكُبْرَىٰ** إِنَّا مُنتَقِمُونَ | كَبُرَ | كُبْرَى | The greatest assault — Day of Judgment | Lesson 1 |
| 20:23 | لِنُرِيَكَ مِنْ آيَاتِنَا **الْكُبْرَى** | كَبُرَ | كُبْرَى | Mūsā before being sent to Pharaoh | Lesson 1 |
| 74:35 | إِنَّهَا لَإِحْدَى **الْكُبَرِ** | كَبُرَ | كُبْرَى | One of the greatest things — warning | Lesson 1 |
| 40:60 | إِنَّ الَّذِينَ **يَسْتَكْبِرُونَ** عَنْ عِبَادَتِي سَيَدْخُلُونَ جَهَنَّمَ دَاخِرِينَ | كَبُرَ | اسْتَكْبَرَ | Direct threat — arrogance vs. worship | Lesson 1 |
| 71:7 | وَإِنِّي كُلَّمَا دَعَوْتُهُمْ لِتَغْفِرَ لَهُمْ جَعَلُوا أَصَابِعَهُمْ فِي آذَانِهِمْ وَاسْتَغْشَوْا ثِيَابَهُمْ وَأَصَرُّوا وَ**اسْتَكْبَرُوا** **اسْتِكْبَارًا** | كَبُرَ | اسْتَكْبَرَ + اسْتِكْبَار | Nūḥ's people — fingers in ears, covered themselves, arrogant with great arrogance | Lesson 1 |
| 7:133 | فَ**اسْتَكْبَرُوا** وَكَانُوا قَوْمًا مُّجْرِمِينَ | كَبُرَ | اسْتَكْبَرَ | Pharaoh's people after the plagues | Lesson 1 |
| 28:39 | وَ**اسْتَكْبَرَ** هُوَ وَجُنُودُهُ فِي الْأَرْضِ بِغَيْرِ الْحَقِّ | كَبُرَ | اسْتَكْبَرَ | Pharaoh and his soldiers — arrogant without right | Lesson 1 |
| 32:15 | إِنَّمَا يُؤْمِنُ بِآيَاتِنَا الَّذِينَ إِذَا ذُكِّرُوا بِهَا خَرُّوا سُجَّدًا وَسَبَّحُوا بِحَمْدِ رَبِّهِمْ وَهُمْ لَا **يَسْتَكْبِرُونَ** | كَبُرَ | اسْتَكْبَرَ | Positive use — believers prostrate and are NOT arrogant | Lesson 1 |
| 21:22 | لَوْ كَانَ فِيهِمَا **آلِهَةٌ** إِلَّا اللَّهُ لَفَسَدَتَا | إِلَٰه | آلِهَة | Famous logical argument for tawḥīd | Lesson 1 |
| 39:46 | قُلِ **اللَّهُمَّ** فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ أَنتَ تَحْكُمُ بَيْنَ عِبَادِكَ | إِلَٰه | اللَّهُمَّ | Beautiful duʿā — Creator + Knower + Judge | Lesson 1 |
| 20:14 | إِنَّنِي أَنَا اللَّهُ لَا **إِلَٰهَ** إِلَّا أَنَا فَاعْبُدْنِي وَأَقِمِ الصَّلَاةَ لِذِكْرِي | إِلَٰه | لَا إِلَٰهَ إِلَّا | Allah speaking directly to Mūsā at the burning bush — powerful story | Lesson 1 |
| 37:35 | إِذَا قِيلَ لَهُمْ لَا **إِلَٰهَ** إِلَّا اللَّهُ **يَسْتَكْبِرُونَ** | إِلَٰه + كَبُرَ | لَا إِلَٰهَ إِلَّا + اسْتَكْبَرَ | Bridges both roots — لَا إِلَٰهَ إِلَّا اللّٰه + arrogance | Lesson 1 |
| 38:5 | أَجَعَلَ الْآلِهَةَ **إِلَٰهًا** وَاحِدًا ۖ إِنَّ هَٰذَا لَشَيْءٌ عُجَابٌ | إِلَٰه | إِلَٰهٌ وَاحِدٌ / آلِهَة | Quraysh mocking "One God?!" — dramatic, both singular and plural in one verse | Lesson 1 |

---

## Hadith & Duas

| Title | Content Summary | Root words | Reason | Flagged in |
|-------|----------------|------------|--------|------------|
| Danger of Kibr — An Atom's Weight | لَا يَدْخُلُ الْجَنَّةَ مَنْ كَانَ فِي قَلْبِهِ مِثْقَالُ ذَرَّةٍ مِنْ كِبْرٍ + "Kibr is rejecting truth and looking down on people" | كَبُرَ | Connects to اسْتَكْبَرَ; unforgettable definition of kibr | Lesson 1 |
| Kibr is Allah's Cloak (Qudsī) | الْكِبْرِيَاءُ رِدَائِي وَالْعَظَمَةُ إِزَارِي | كَبُرَ | كِبْرِيَاء belongs to Allah exclusively — powerful | Lesson 1 |
| Twelve Angels Rushed | اللهُ أَكْبَرُ كَبِيرًا وَالْحَمْدُ لِلَّهِ كَثِيرًا — "gates of heaven opened" | كَبُرَ | أَكْبَرُ + كَبِيرًا together; beautiful story | Lesson 1 |
| Sins Washed Like Sea Foam | مَنْ سَبَّحَ اللهَ...وَكَبَّرَ اللهَ — "sins forgiven like foam of the sea" | كَبُرَ | Has كَبَّرَ (Form II); powerful reward | Lesson 1 |

---

## Deferred Forms

Morphological forms from past roots that haven't been introduced yet. Candidates for Learning slots in future lessons.

| Form | Transliteration | Root word | Count | Priority | Notes | Flagged in |
|------|----------------|-----------|-------|----------|-------|------------|
| كَبَّرَ | kabbara (Form II) | كَبُرَ | 4 | **High** | Directly means "do takbīr" — strong connection to Lesson 1 anchor | Lesson 1 |
| مُتَكَبِّر | mutakabbir (Form V ptcp) | كَبُرَ | 7 | **High** | Name of Allah (59:23) — الْمُتَكَبِّرُ | Lesson 1 |
| كَبِيرَة / كَبَائِر | kabīrat | كَبُرَ | 7 | Medium | "Great sins" — important moral vocabulary | Lesson 1 |
| كِبَر | kibar | كَبُرَ | 6 | Medium | "Old age" — includes famous parents verse 17:23 | Lesson 1 |
| كِبْر | kibr | كَبُرَ | 2 | Low | "Pride" — only 2 occurrences | Lesson 1 |
| كِبْرِيَاء | kibriyā' | كَبُرَ | 2 | Low | "Supreme majesty" — only 2 occurrences | Lesson 1 |
| كُبَّار | kubbār | كَبُرَ | 1 | Low | Intensive "immensely great" — only 71:22 | Lesson 1 |
| كُبَرَاء | kubarā' | كَبُرَ | 1 | Low | "Great ones / leaders" — only 33:67 | Lesson 1 |
| تَكْبِير | takbīr | كَبُرَ | 1 | Low | Verbal noun — only in 17:111 (already with كَبَّرَ) | Lesson 1 |
| مُسْتَكْبِر | mustakbir | كَبُرَ | 6 | Medium | Form X participle — "the arrogant ones" | Lesson 1 |
| اسْتِكْبَار | istikbār | كَبُرَ | 2 | Low | Form X verbal noun — only 2 occurrences | Lesson 1 |
| أَكْبَرَ (verb IV) | akbara | كَبُرَ | 1 | Low | "Were astonished" — only 12:31 (Yūsuf story, memorable) | Lesson 1 |
| تَكَبَّرَ | takabbara (Form V) | كَبُرَ | 2 | Low | Form V verb — only 2 occurrences | Lesson 1 |
| إِلَٰهَهُ هَوَاهُ | — | إِلَٰه | 2 | Medium | "Took his desire as his god" (25:43, 45:23) — striking image | Lesson 1 |
| أَإِلَٰهٌ مَعَ اللّٰه | — | إِلَٰه | 5 | Medium | Five rhetorical questions in 27:60–64 — powerful sequence | Lesson 1 |

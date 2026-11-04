# Example-note editorial record

The owner asked to retire the former 300 Crossed examples and adapt 500 of Bul Beni's examples instead. This replacement uses **fictional seed content**, not real users' posts, profiles, photographs, or messages. The upstream SQL files explicitly label the source as non-real seed data. No Bul Beni database credentials or API calls were needed.

Source: `scripts/ilan-metinleri-1000.md` in the owner's Bul Beni repository. The source file contains 1,000 examples, including 750 missed-encounter notes. The 500 selected distinct source rows and their exact text, source numbers, original questions, source-file SHA-256, adapted IDs and destination settings are recorded in `demo-adaptations.json` beside this document. The owner authorized reuse. The original source contains recurring scene families; these adaptations do not claim 500 unrelated plot concepts.

Editorial rules:

- Preserve an ordinary encounter: a brief conversation, shared table, returned item, smile or missed introduction. No invented jokes, emotional-support gifts, exaggerated chemistry or claims about the other person's feelings.
- Adapt Turkish place references to the selected mapped US venue. Keep the scene compatible: printers/bookshelves belong in libraries or campuses; ordering coffee belongs in cafes; boarding belongs at transport locations; dogs and grass belong outdoors.
- Omit incompatible sources rather than manufacture US transit routes, faculties, shops or a venue's precise internal layout. Campus/park points remain approximate mapped locations, not certified entrances.
- Translate recognizable clothing and meaningful incident details where present. Optional questions remain from the author's perspective and relate to the adapted scene.
- Keep conversational English with limited informal spelling. No contact details, private information, real user identities or fictitious database users.
- Retire every old `demo-N` record. New stable `demo-bb-N` IDs refer to their original seed-row numbers; old IDs are not reassigned to different people/scenes.
- Spread all500 examples across232 mapped venues, no more than3 per venue, no coordinate jitter. 302 cafe,150 campus,48 other notes. Dates reflect source labels relative to the editorial date,2026-11-04.

Examples remain visibly labeled `Example`, can be hidden, and cannot receive real messages. The audit is included in the source archive, not imported into the client bundle. Automated checks enforce count, source uniqueness, valid fields, compatible destination kinds, stable identifiers and distribution; they do not substitute for editorial judgment or verify fictional events as real.

## Editorial revision 2

The owner rejected venue-suffixed titles and repeated paragraphs. All500 titles and bodies were individually rewritten using the existing fictional scene families as inspiration; appearance and incidental details are fictional editorial additions, not literal translations of the source. The source ledger retains the original text for provenance. There are472 person-focused titles and81 optional questions matched to the new scenes. Venue names appear in the separate location label, not the title. Existing IDs, dates,232 coordinates and max3/location distribution are retained.

Exact title/story uniqueness and pairwise four-word overlap are checked in tests. These checks catch copied wording, not semantic originality; ordinary situations such as shared tables and missed introductions intentionally recur.

## Editorial revision 3

The owner's latest clarification permits an occasional natural cafe mention, but prohibits an automatic `— Venue name` title suffix. Every title is <=32 characters/6 words. Short descriptions may repeat across different fictional people; bodies remain distinct. Removed title-only context was moved into the body where needed. Five short natural cafe references remain. Conversational variants include lowercase writing, omitted apostrophes, fragments, fewer terminal periods and occasional `bc`, `tho` or `lol`; readability and scene coherence remain required.

## Editorial revision 4

The owner approved a loose30%person/30%moment/20%direct/15%setting/5%detail mix, expressly prohibiting unrelated details introduced for variety. Current counts are150/150/100/74/26 respectively.350 titles were individually written after reading each existing story;150 short descriptions remain. Each record's `titleReview` contains its final title, editorial kind, evidence source and supporting passage or mapped venue name. No weekdays were invented to fill the setting category. All titles remain <=32characters/6words with no automatic venue suffix.

Only titles and deterministic feed order changed: bodies, author questions, venues, dates, aliases and IDs remain identical. Broad mix/repetition and evidence-integrity checks are regression guards, not automated semantic validation.

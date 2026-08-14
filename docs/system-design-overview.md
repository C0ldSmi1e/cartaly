# Cartaly — overview

Photograph a restaurant menu → translated dish names, prices, and a generated photo of every dish. Lives at cartaly.app.

The target user is sitting in a restaurant abroad, holding a menu they can't read, with no photos to point at. Translation-camera apps produce literal word soup and nothing visual. Cartaly produces a menu you can actually order from.

## How it works

```
photo → parse + translate (one call, cached) → menu text on screen in ~2–3 s
      → each dish image loads as it scrolls into view
        (any dish ever generated before, by anyone, appears instantly)
```

One vision-model call reads the photo and translates it in the same step — dish names, descriptions, prices, dietary tags. That text renders immediately. Images come second: each card requests its picture only when it approaches the screen, and every generated image is stored permanently under the dish's original-language name.

## Design principles

1. **Text before pictures.** The useful part of the menu — what things are and what they cost — never waits on image generation.
2. **Never compute twice.** Parses are cached per photo + language. Images are cached per dish and shared across all users, menus, and languages: "ผัดไทย" is generated once, ever, globally. Popular menus converge to instant and nearly free.
3. **Lazy by default.** No image is generated until someone is about to look at it. Nobody pays for dish #24 that was never scrolled to.
4. **Fail small.** A failed image is a retry button on one card. A blurry line item is flagged low-confidence. The menu itself never breaks.

Other decisions that shape the product:

- **Original names stay visible** under the translations, so you can match a card to the physical menu in your hand.
- **Keying images on the original name** is what makes translation cheap: switching the app to French re-translates text but never regenerates a single image.
- **The image endpoint is not open.** It only honors requests tied to a real parsed menu, plus per-IP rate limits — generation costs real money and would otherwise be a free image API for strangers.

## Spec

**MVP**
- Snap or upload a menu → translated, visual menu.
- Language picker (defaults to your phone's language) and price conversion to your home currency, marked approximate.
- Filters: vegetarian / vegan / gluten-free / spicy, spice-level dots, category sections, search in both languages.
- Order builder: tap dishes into a list, see the running total, then a full-screen "show to waiter" view of the original names.
- Every parsed menu gets a shareable link — one person scans, the whole table browses.

**Next**
- Dish detail sheet: ingredients, origin, taste profile, generated on demand and cached.
- Multi-page menus (most real menus are 2–6 photos).
- Allergen warnings: set allergies once, matching dishes get a badge, plus an "I'm allergic to X" phrase in the menu's language. Clearly disclaimed as AI-inferred — confirm with staff.
- Pronunciation help for ordering out loud.
- Works offline for menus you've already opened.

**Later**
- "What should I order?" — three picks with reasons, based on your preferences.
- Popularity badges, derived free from cache hit counts.
- Drink pairings.
- Restaurant mode: a restaurant uploads its menu once and gets a permanent QR-linked visual menu page.

## Performance & cost expectations

A menu nobody has ever scanned: text in ~3 s, images appearing within ~5–15 s as you scroll, well under $0.50 total. Any menu or dish seen before: effectively instant and free. Cache hit-rate is the one number that governs both speed and cost.

## Build order

1. Photo → translated text menu on screen.
2. Lazy, cached dish images + rate limits.
3. Language picker, filters, order builder, share links.
4. "Next" list by appetite.
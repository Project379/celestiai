<!--
  PRIVACY POLICY DRAFT — counsel-bound. Do not merge to apps/web/app/privacy/page.tsx
  until Bulgarian privacy/data-protection counsel has reviewed and signed off.

  Drafted: 2026-04-27 (§11.1 of Item 7 / §11 partial workstream).
  Source page (current live, pre-rewrite): apps/web/app/privacy/page.tsx
  Section IV's misleading "от настройките за поверителност" claim was softened
  in commit 9337115 (§11.x); the rest of the live page predates §8 (diary),
  §9 (ephemeris validation), §10 (Sentry). This draft brings disclosures
  current and adds the legally-required structural sections (legal basis,
  retention, cross-border transfers, processor list) absent from the current
  live page.

  Voice register: editorial Bulgarian with informal "ти" address dominant
  (matches existing brand voice). Formal Bulgarian-legal terms inserted
  where compliance language is required (ОРЗД, КЗЛД, ДЛЗД, Art. 6 / Art. 13
  references, processor-name labels). Counsel may recalibrate to formal
  Вие throughout for legal soundness — that is counsel's call.

  Counsel-review markers: <!-- COUNSEL-REVIEW: ... --> blocks flag specific
  questions for legal review. Counsel should redline each.

  On counsel sign-off, §11.6 converts this draft into the live TSX page at
  apps/web/app/privacy/page.tsx, preserving the existing visual / typographic
  design (Cinzel eyebrow + display font + section-by-section dl/dt/dd).
-->

# Политика за поверителност — Stellaeum AI

**Последна актуализация на черновата:** 2026-04-27 (предстои преглед от адвокат)

**Метаописание (за TSX `<Metadata>`):** *Как Stellaeum AI събира, използва и защитава личните ти данни.*

---

## Въведение (Hero / lead-in)

Данните ти са твои. Тази политика обяснява какви данни събираме, как ги използваме, къде се съхраняват, кои външни обработващи участват и какви са твоите права съгласно Общия регламент за защита на данните (ОРЗД, Регламент (ЕС) 2016/679) и Закона за защита на личните данни (ЗЗЛД).

Документът е структуриран в единадесет раздела. Първите седем покриват ежедневното — какви данни, защо, как се пазят, твоите права, бисквитки, контакт, промени. Последните четири покриват изискваните от ОРЗД технически разкрития — правни основания, срокове на съхранение, прехвърляне извън ЕС и пълен списък на обработващите.

<!-- COUNSEL-REVIEW: Bulgarian privacy policies often open with formal
identification of the controller (име на администратора, ЕИК, адрес,
контакт) before any substantive content — required by Art. 13(1)(a)
ОРЗД. The current page omits this; counsel should advise on the
correct formal identification block placement. Founder entity status
(ЕООД vs. ЕТ vs. individual sole proprietor) confirms what to put
here. -->

---

## I — Какви данни събираме

При използване на Stellaeum AI събираме следните категории лични данни:

- **Идентификационни данни на профила** — имейл адрес, идентификатор от Clerk (auth провайдъра), при наличие на регистрация.
- **Рождени данни** — дата, час и място на раждане. Използват се за изчисление на наталната ти карта.
- **Изчисления на наталната карта** — генерирани от рождените данни, съхранявани локално в нашата база.
- **AI четения** — съдържанието на персонализираните четения, които Оракулът създава за теб.
- **История на дневни хороскопи** — генерирани прогнози по дни.
- **Записи в дневника** *("Кръг" / лунен дневник)* — намеренията, които записваш по фази на луната, заедно с дата и фаза. Съдържанието на записите ти е лично и не се споделя.
- **Метаданни на абонамент** — статус на абонамента (free / premium), вид (месечен / годишен), дата на следващо плащане, статус на тестов период (`trial_claimed_at`). Самата информация за платежния метод се обработва изцяло от Stripe — ние не съхраняваме номера на карти.
- **Push абонаменти** — endpoint и криптографски ключове за изпращане на известия за дневен хороскоп, ако си се абонирал/а за известия.
- **Технически данни от наблюдение на грешки** — стек следи, маршрут, идентификатор на грешка (`ERR-*`), времеви маркер. Изпращат се до Sentry за отстраняване на проблеми в продукция. Не изпращаме съдържанието на заявки и отговори, нито имейл адреси или IP адреси (изключени сме от поведението по подразбиране на Sentry чрез `sendDefaultPii: false`).
- **Журнал за одит** — записи за чувствителни действия (например изтегляне на данни, заявка за изтриване на акаунт), използвани за вътрешен преглед на сигурността.

<!-- COUNSEL-REVIEW: §11.4 DPA audit will surface whether
users.subscription_status + users.trial_claimed_at fields contain
anything user-identifying beyond what's listed above. Founder verifies
content of these columns before counsel review (per founder action
item from §11 partial opening). -->

---

## II — Как използваме данните

Личните ти данни се използват за следните цели:

- **Генериране на персонализирано астрологично съдържание** — натална карта, AI четения, дневни хороскопи, дневник по фази на луната.
- **Обработка на плащания** — чрез Stripe (виж раздел XI за информация за обработващия).
- **Изпращане на push известия** — само ако си се абонирал/а за дневния хороскоп.
- **Наблюдение и отстраняване на грешки в продукция** — чрез Sentry, с цел стабилност и качество на услугата.
- **Изпълнение на правни задължения** — например изпълнение на ОРЗД заявки за достъп, изтриване, преносимост (виж раздел IV).
- **Поддържане на журнал за одит** — за вътрешен преглед на сигурността и при необходимост за защита срещу злоупотреба или измама.

Не използваме данните ти за реклама, за профилиране от трети страни, нито ги продаваме.

---

## III — Съхранение и защита

Данните ти се съхраняват в **Supabase (PostgreSQL)** с проект, локализиран във Франкфурт, Германия — без прехвърляне извън Европейския съюз за европейски потребители. Базата данни ползва криптиране в покой и Row Level Security (RLS) политики, които ограничават достъпа до собствените ти редове.

Достъпът се предава изцяло през HTTPS / TLS. Автентикацията се управлява от **Clerk** с индустриални стандарти за сигурност (multi-factor authentication, защита срещу brute-force атаки).

**Sentry GmbH** обработва само технически данни от наблюдение на грешки — със зададен EU регион (Франкфурт). PII по подразбиране е изключено.

**OpenRouter** обработва AI заявките, които генерират четенията. Заявките съдържат рождени данни в контекст за персонализация. OpenRouter е базиран в САЩ и прехвърлянето се покрива от Стандартни договорни клаузи (виж раздел X).

**Vercel** хоства приложението с регионално закрепване във Франкфурт. Vercel вижда само метаданни на заявките (IP, user agent) на edge слоя и не съхранява персистентни идентификационни данни.

**Stripe** обработва платежни данни — вкл. номера на карти. Ние не виждаме и не съхраняваме номера на карти.

<!-- COUNSEL-REVIEW: This section conflates "where data lives" with
"which processor sees what." Counsel may want clearer separation —
data-storage block (Supabase only as authoritative store) vs
processing-touch block (Sentry, OpenRouter, Vercel, Stripe pass
through but don't authoritatively store). Bulgarian privacy-policy
convention may differ from this structuring. -->

---

## IV — Твоите права

Съгласно ОРЗД (членове 15-22) имаш следните права:

- **Право на достъп** *(чл. 15)* — можеш да поискаш копие на всички лични данни, които съхраняваме за теб.
- **Право на корекция** *(чл. 16)* — можеш да коригираш неточни рождени данни от профила си по всяко време.
- **Право на изтриване** *(чл. 17, "right to be forgotten")* — можеш да заявиш изтриване на акаунта и данните си с 30-дневен гратисен период, през който заявката може да бъде отменена.
- **Право на ограничаване на обработването** *(чл. 18)* — можеш да поискаш временно ограничаване на обработването на данните ти.
- **Право на преносимост** *(чл. 20)* — можеш да изтеглиш всичките си данни в машинно-четим формат (JSON) и да ги пренесеш към друг доставчик.
- **Право на възражение** *(чл. 21)* — можеш да възразиш срещу обработване, основано на легитимен интерес.
- **Право да подадеш жалба** — пред Комисията за защита на личните данни (КЗЛД) на адрес `kzld.bg`, ако смяташ, че обработваме данните ти неправомерно.

**Как да упражниш тези права:** засега изпрати заявка на support@stellaeum.com — обработваме отговор в законовия срок до един месец. Автоматичен интерфейс за изтегляне и заявка за изтриване предстои в следваща версия на приложението.

<!-- COUNSEL-REVIEW: Once §11.2 ships /privacy-settings UI (post Phase A
mobile scaffolding), the "support@stellaeum.com" path becomes a
fallback. The text should be updated then. Until then, this is the
current truth. -->

---

## V — Бисквитки и проследяване

Използваме само **сесийни бисквитки от Clerk** за поддържане на автентикацията. Тези бисквитки са функционално необходими (essential) и попадат в изключението от изискването за съгласие по Директивата за електронната неприкосновеност (ePrivacy).

Не използваме бисквитки за проследяване, реклама, profiling, или анализ на поведение.

<!-- COUNSEL-REVIEW: When Item 1 (analytics / telemetry) ships, this
section needs revisiting. If chosen analytics vendor uses tracking
cookies, a consent banner is required under ePrivacy + ОРЗД, and this
section's "no tracking cookies" claim becomes false. §11.3 currently
defers this decision to Item 1. -->

---

## VI — Контакт

За въпроси относно обработването на личните ти данни, заявки по ОРЗД или сигнали за съмнение за нарушение, пиши ни на:

**support@stellaeum.com**

<!-- COUNSEL-REVIEW: GDPR Art. 37 thresholds for mandatory DPO
appointment (Длъжностно лице по защита на данните, ДЛЗД) likely not
triggered for Stellaeum's current scale (no large-scale special-category
processing, no large-scale systematic monitoring). Counsel should
confirm and advise whether to add an explicit "ДЛЗД не е назначено
съгласно чл. 37 ОРЗД, тъй като дейностите по обработване не попадат
в задължителните основания" line, or simply omit. -->

За жалби пред надзорен орган: **Комисия за защита на личните данни (КЗЛД)** — `kzld.bg`, адрес: бул. „Проф. Цветан Лазаров" 2, София 1592, България.

---

## VII — Промени в политиката

Запазваме си правото да актуализираме тази политика при промяна на услугите, технически партньори или приложимото законодателство. При съществени промени, които засягат правата ти или начина на обработване, ще те уведомим чрез приложението поне 14 дни преди влизане в сила.

**Историята на промените** ще се поддържа в тази секция след първото публикуване.

---

## VIII — Правни основания за обработване

Съгласно член 6 ОРЗД, всяко обработване на лични данни се извършва на едно от следните правни основания. Таблицата по-долу свързва дейностите по обработване с правните им основания.

| Дейност | Правно основание | Основа |
|---|---|---|
| Регистрация на профил, автентикация, сесии | Изпълнение на договор *(чл. 6, ал. 1, б. „б")* | Услугата изисква регистриран профил; договорът за ползване се сключва при регистрация. |
| Запазване на рождени данни и изчисления | Изпълнение на договор *(чл. 6, ал. 1, б. „б")* | Основната функционалност на услугата — натална карта, четения, хороскопи. |
| Генериране на AI четения | Изпълнение на договор *(чл. 6, ал. 1, б. „б")* | Премиум функция, заявена изрично от потребителя. |
| Дневник по фази на луната | Изпълнение на договор *(чл. 6, ал. 1, б. „б")* | Функционалност на услугата, активна по подразбиране. |
| Push известия | Съгласие *(чл. 6, ал. 1, б. „а")* | Изпращат се само след изричен opt-in от потребителя. |
| Обработка на плащания | Изпълнение на договор *(чл. 6, ал. 1, б. „б")* | Премиум абонаменти. |
| Наблюдение на грешки в продукция (Sentry) | Легитимен интерес *(чл. 6, ал. 1, б. „е")* | Поддържане на стабилност, сигурност и качество на услугата. PII е изключено. |
| Журнал за одит | Легитимен интерес + правно задължение *(чл. 6, ал. 1, б. „е" и „в")* | Защита срещу злоупотреба, изпълнение на ОРЗД отчетност (чл. 30). |

<!-- COUNSEL-REVIEW: Bulgarian translations of GDPR Article 6 grounds —
verify exact official language. The labels "изпълнение на договор",
"съгласие", "легитимен интерес" follow standard Bulgarian academic
GDPR translation but counsel should confirm against КЗЛД publications. -->

---

## IX — Срок на съхранение

| Категория данни | Срок | Основа |
|---|---|---|
| Профилни данни (имейл, идентификатор от Clerk) | До изтриване на акаунта *(вкл. 30-дневен гратисен период)* | Договорно изпълнение, чл. 17 ОРЗД при заявка за изтриване. |
| Рождени данни и изчисления на карта | До изтриване на акаунта | Същото. |
| AI четения | До изтриване на акаунта | Същото. |
| Дневник | До изтриване на акаунта | Същото. Дневникът е лично съдържание и се пази до изричната заявка за изтриване. |
| История на дневни хороскопи | До изтриване на акаунта | Същото. |
| Push абонаменти | До изтриване на акаунта или отписване от известията | Същото. |
| Метаданни на абонамент / плащане | 7 години след прекратяване | **Изискване на Закона за счетоводството** *(чл. 12)* — счетоводни записи се съхраняват за определени срокове независимо от заявка за изтриване. |
| Технически данни от Sentry | 90 дни *(стандартен срок на Sentry за error events на безплатен план)* | Договор с обработващия Sentry. |
| Журнал за одит | Безсрочно, докато съществува организацията | Защита на сигурността + ОРЗД отчетност. |

<!-- COUNSEL-REVIEW: Retention periods are based on best-effort estimates
from Bulgarian law (Закон за счетоводството чл. 12 → 7 years for
financial records). Counsel must verify each row, especially:
(a) audit log retention indefinite — is there a maximum?
(b) Sentry 90-day default — confirm against current Sentry plan.
(c) Bulgarian-specific retention requirements not listed here. -->

---

## X — Прехвърляне на данни извън ЕС

Данните на потребителите се обработват предимно в Европейския съюз. Когато се налага прехвърляне извън ЕС, използваме механизмите, предвидени в ОРЗД (членове 44-49).

| Обработващ | Държава | Механизъм за прехвърляне |
|---|---|---|
| Supabase | EU (Франкфурт) | Без прехвърляне — обработването се извършва в ЕС. |
| Sentry GmbH | EU (Франкфурт) | Без прехвърляне — обработването се извършва в ЕС. |
| Clerk | САЩ | Сертификация по EU-US Data Privacy Framework (DPF). |
| Stripe | Глобално, регионално закрепване | Регионална адекватност + Стандартни договорни клаузи (СДК) при необходимост. |
| OpenRouter | САЩ | Стандартни договорни клаузи (СДК) — задължителен механизъм след решението на Съда на ЕС по дело Schrems II. |
| Vercel | Глобално, регионално закрепване (`fra1` за ЕС трафик) | Регионална адекватност + СДК при необходимост. |

**Обобщение:** за европейски потребители основните потоци (база данни, наблюдение на грешки) остават в ЕС. AI обработката (OpenRouter) и автентикацията (Clerk) включват прехвърляне към САЩ, покрито от съответния правен механизъм.

<!-- COUNSEL-REVIEW: Schrems II implications + DPF current status (DPF
self-certification post-2023 framework). Counsel should verify each
processor's current cross-border legal basis is still valid as of
2026-04-27 and that Bulgarian-specific transparency requirements are
met. -->

---

## XI — Списък на обработващите

Следните трети страни обработват лични данни от името на Stellaeum AI:

| Обработващ | Цел | Регион | Политика за поверителност |
|---|---|---|---|
| **Clerk** | Автентикация, профили, сесии | САЩ (DPF) | `clerk.com/legal/privacy` |
| **Supabase** | База данни (PostgreSQL) | EU — Франкфурт | `supabase.com/privacy` |
| **Stripe** | Обработка на плащания | Глобално | `stripe.com/privacy` |
| **OpenRouter** | AI инференция (Llama 3.3 70B чрез `meta-llama/llama-3.3-70b-instruct`) | САЩ | `openrouter.ai/privacy` |
| **Sentry GmbH** | Наблюдение на грешки в продукция | EU — Франкфурт | `sentry.io/privacy/` |
| **Vercel** | Хостинг и edge | Глобално, `fra1` за ЕС | `vercel.com/legal/privacy-policy` |

DPA статус на всеки обработващ се проследява в `.planning/legal/processor-dpa-audit.md` (вътрешен документ, не публичен).

<!-- COUNSEL-REVIEW: All privacy-policy URLs marked "[verify]" — counsel
should confirm each link is current and accessible. The OpenRouter
link in particular may require updating depending on their public
policy availability. -->

---

## Подпис

<!-- COUNSEL-REVIEW: Final signature / publication block — typical
Bulgarian privacy policies sign off with administrator name + date
+ contact. Founder confirms entity name and ЕИК (if registered) for
this block; if not registered, counsel advises on correct sole-trader
identification. -->

**Администратор на лични данни:** *[founder entity — to be filled post-counsel-review]*
**Дата на влизане в сила:** *[to be filled at publication]*
**Версия:** *[to be filled at publication]*

---

<!-- END OF DRAFT — counsel-review markers above are exhaustive but
counsel should redline anywhere their professional judgment requires.
On counsel sign-off, §11.6 converts this draft into the live TSX page
at apps/web/app/privacy/page.tsx, preserving the existing visual
design (Cinzel eyebrow + display font + section-by-section dl/dt/dd). -->

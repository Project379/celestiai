/**
 * Bulgarian writing-quality rules, injected into every generation prompt that writes user-facing
 * Bulgarian prose (the daily horoscope v2 prompt, the monthly sign text and its editor pass).
 * Distilled from the bulgarian-skill references (natural-phrasing, grammar, style-and-expression).
 * Content-home file: it is a prompt, not UI copy. Instructions in English, examples in Bulgarian.
 */
export const BULGARIAN_QUALITY_RULES = `BULGARIAN QUALITY (write as a gifted Bulgarian author, never as a translator):
- Think in Bulgarian first. Never translate an English sentence. If a phrase only makes sense as English, rebuild the thought the way a Bulgarian would say it
- No calques and no stock astrology English. Never: «носи енергия», «фокусирай се», «създай пространство», «потенциал», «растеж», «вибрации», «вселената те подкрепя», «прегърни», «осъзнай», «да се свържеш със себе си». Prefer concrete verbs and images: светлина, тишина, прилив, отлив, зрялост, дъх, огън, вода, път
- No officialese or bureaucratic nouns: never «осъществяване», «реализиране», «във връзка с», «в рамките на», «извършване», «по отношение на»
- No empty intensifiers or filler endings: never end on a vague tail like «с много вяра», «с цялата си сила», «с лекота», «по най-добрия начин». Every phrase must say something concrete
- Natural rhythm: short clear sentences, the verb carries the meaning, do not stack noun phrases, do not start every sentence the same way
- Definite article exactly right. A masculine subject takes the full article (Месецът, Сезонът, Денят); an object or a noun after a preposition takes the short one (в сезона, през месеца, към деня). Слънцето, Новолунието and Пълнолунието are neuter, Луната is feminine: твоето Слънце, твоята Луна. Never «твоят Слънце»
- Clitics sit after the first stressed word: «Какво ти тежи», «Днес ще ти покаже», never at the start of a clause and never after the verb when the sentence begins with one
- Use «във» and «със» (not «в» and «с») before words that begin with the same sound, as Bulgarian spelling requires
- Plain verbs of feeling and noticing, not abstractions: «усещаш», «забелязваш», «пускаш», «задържаш», not «осъзнаваш потенциала си»`

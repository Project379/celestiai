/**
 * Evergreen monthly texts: the approved fallback for every zodiac sign. Shown when a month's
 * generated text was rejected by the founder, failed validation after all retries, or does not
 * exist yet. They never name a month or a dated sky event, so they are true in any month.
 *
 * Content-home file, copy-locked. APPROVED COPY ONLY: these 12 are DRAFTS until the founder
 * approves them (strings table, 2026-10-09). Do not edit a line without the founder's say-so.
 * Voice: mystical, about the sky; sentence 2 an invitation. No gender, no «ние», no numbers,
 * no assumption about the reader's life. Pinned by test/sign-month/evergreen.test.ts.
 */
import type { ZodiacSign } from '@stellaeum/astrology/client'

export const SIGN_MONTH_EVERGREEN: Record<ZodiacSign, string> = {
  aries: 'Огънят на Марс ти е верен спътник. Забележи кога гори тихо и кога иска да лумне.',
  taurus: 'Венера те учи да цениш бавното и истинското. Забележи кое от това, което имаш, е най-красиво.',
  gemini: 'Меркурий ти шепне мисли, които още нямат думи. Вслушай се коя от тях иска да бъде казана.',
  cancer: 'Луната е твоята небесна сродница и приливите ти следват нейните. Забележи кога ти се иска тишина.',
  leo: 'Слънцето е сърцето ти на небето. Позволи си да засияеш, без да чакаш аплодисменти.',
  virgo: 'Небето обича тихото ти внимание към малките неща. Позволи си да не търсиш съвършенство в тях.',
  libra: 'Равновесието е изкуство, на което те учи Венера. Вслушай се коя страна на нещата те тегли.',
  scorpio: 'Плутон пази дълбоките води на твоя знак. Позволи си да пуснеш нещо, което отдавна е потънало.',
  sagittarius: 'Юпитер разтваря хоризонтите пред стрелата ти. Забележи накъде най-сладко те тегли любопитството.',
  capricorn: 'Сатурн е старият пазител на търпението. Забележи колко път вече е зад гърба ти.',
  aquarius: 'Уран носи ветрове, които не питат за стари пътища. Остави едно свое различие да си поеме въздух.',
  pisces: 'Нептун разтваря границите като вода в мъгла. Позволи на сънищата си да ти кажат нещо.',
}

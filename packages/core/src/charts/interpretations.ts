import type {AspectData, Planet, ZodiacSign} from '@stellaeum/astrology/client'
import {PLANETS_BG, ZODIAC_SIGNS_BG} from '@stellaeum/astrology/client'
import {bgPrep} from '../i18n/bg-grammar'

export interface InterpretationData {
    title: string
    position: string
    brief: string
    overview: string
    strengths: string[]
    challenges: string[]
    growth: string
    aspectInsights: string[]
}

const PLANET_OVERVIEW: Record<Planet, string> = {
    sun: 'Слънцето показва твоята същност, жизнена сила, увереност и начина, по който искаш да се изразиш.',
    moon: 'Луната описва емоционалния ти свят, вътрешните нужди, паметта и начина, по който търсиш сигурност.',
    mercury: 'Меркурий описва начина, по който мислиш, учиш, говориш и подреждаш информацията.',
    venus: 'Венера показва какво цениш, как обичаш, как привличаш и как търсиш удоволствие и близост.',
    mars: 'Марс показва твоя импулс за действие, смелостта ти и начина, по който преследваш целите си.',
    jupiter: 'Юпитер показва къде идват растежът, смисълът, вярата и усещането за възможност.',
    saturn: 'Сатурн описва уроците, ограниченията, отговорността и мястото, където зрялостта се изгражда бавно.',
    uranus: 'Уран носи оригиналност, внезапни промени, свобода и стремеж към независимост.',
    neptune: 'Нептун описва въображението, интуицията, духовността и зоните, в които границите се размиват.',
    pluto: 'Плутон показва дълбоката трансформация, силата, вътрешната устойчивост и процесите на прераждане.',
    northNode: 'Северният възел показва посоката на развитие, към която животът ти тласка постепенно.',
}

const PLANET_STRENGTHS: Record<Planet, string[]> = {
    sun: ['естествено себеизразяване', 'творческа жизненост', 'лидерство чрез автентичност'],
    moon: ['емоционална интелигентност', 'дълбока чувствителност', 'силен усет за принадлежност'],
    mercury: ['умствена бързина', 'ясно изразяване', 'способност да виждаш модели'],
    venus: ['социална мекота', 'усет към красота и ценности', 'способност за хармония'],
    mars: ['инициатива', 'смелост под напрежение', 'пряко действие'],
    jupiter: ['оптимизъм', 'широка перспектива', 'щедрост на духа'],
    saturn: ['дисциплина', 'издръжливост', 'стратегическа зрялост'],
    uranus: ['иновативност', 'независимост', 'свеж поглед'],
    neptune: ['въображение', 'духовна чувствителност', 'усет към символи'],
    pluto: ['дълбочина', 'устойчивост', 'трансформиращ фокус'],
    northNode: ['растеж чрез предизвикателство', 'ориентация към бъдещето', 'вътрешен подтик за развитие'],
}

const PLANET_CHALLENGES: Record<Planet, string[]> = {
    sun: ['защитна гордост', 'зависимост от признание', 'преумора от нуждата да се доказваш'],
    moon: ['емоционална реактивност', 'затваряне в защита', 'привързване към стари емоционални модели'],
    mercury: ['прекалено мислене', 'разпилян фокус', 'говорене без истинска дълбочина'],
    venus: ['угодничене', 'избягване на напрежение', 'бъркане на удобството с истинско съзвучие'],
    mars: ['нетърпение', 'изостряне на конфликти', 'натиск за прекалено бързи резултати'],
    jupiter: ['прекаляване', 'свръхувереност', 'обещания без устойчивост'],
    saturn: ['самокритика', 'страхова сдържаност', 'усещане за тежест или забавяне'],
    uranus: ['нестабилност', 'бунт заради самия бунт', 'трудност с рутината'],
    neptune: ['объркване', 'идеализация', 'неясни граници'],
    pluto: ['борба за контрол', 'твърде голяма интензивност', 'трудност да пускаш старото'],
    northNode: ['съпротива към растежа', 'вкопчване в познатото', 'избягване на следващата стъпка'],
}

const SIGN_BRIEF: Record<ZodiacSign, string> = {
    aries: 'директен, бърз и инициативен',
    taurus: 'устойчив, земен и практичен',
    gemini: 'любопитен, гъвкав и умен',
    cancer: 'чувствителен, защитен и интуитивен',
    leo: 'ярък, изразителен и сърдечен',
    virgo: 'прецизен, наблюдателен и подреден',
    libra: 'дипломатичен, свързващ и хармоничен',
    scorpio: 'интензивен, дълбок и преобразяващ',
    sagittarius: 'широк, търсещ смисъл и свободолюбив',
    capricorn: 'дисциплиниран, стратегически и устойчив',
    aquarius: 'независим, визионерски и различен',
    pisces: 'въображаем, мек и съпричастен',
}

const SIGN_INFLECTION: Record<ZodiacSign, string> = {
    aries: 'Този знак добавя спешност, смелост и нужда да действаш, преди импулсът да изчезне.',
    taurus: 'Този знак добавя стабилност, търпение и стремеж към нещо реално, сигурно и устойчиво.',
    gemini: 'Този знак добавя гъвкавост, словесна лекота и нужда идеите да се движат.',
    cancer: 'Този знак добавя чувствителност, защитност и силна потребност от емоционална сигурност.',
    leo: 'Този знак добавя топлина, творческа гордост и желание да се изразяваш видимо и смислено.',
    virgo: 'Този знак добавя наблюдателност, умение за усъвършенстване и внимание към детайла.',
    libra: 'Този знак добавя дипломатичност, усет за отношения и стремеж към справедливост и красота.',
    scorpio: 'Този знак добавя дълбочина, фокус и способност да стигаш под повърхността.',
    sagittarius: 'Този знак добавя оптимизъм, откровеност и нужда от смисъл, хоризонт и свобода.',
    capricorn: 'Този знак добавя сериозност, издържливост и инстинкт да изграждаш нещо трайно.',
    aquarius: 'Този знак добавя обективност, оригиналност и нужда да мислиш извън готовите модели.',
    pisces: 'Този знак добавя състрадание, въображение и чувствителност към фините емоционални течения.',
}

const HOUSE_MEANING: Record<number, string> = {
    1: 'Това положение се проявява силно в начина, по който се показваш, реагираш и влизаш в живота.',
    2: 'Това положение работи през теми като ценности, пари, сигурност и самооценка.',
    3: 'Това положение се изразява чрез учене, общуване, мислене и ежедневна среда.',
    4: 'Това положение се корени в дома, рода, паметта и вътрешната емоционална основа.',
    5: 'Това положение иска изразяване чрез творчество, романтика, радост и смелост да се показваш.',
    6: 'Това положение действа през работа, навици, здраве и малките структури на ежедневието.',
    7: 'Това положение се вижда ясно в партньорства, огледални отношения и близки взаимодействия.',
    8: 'Това положение усилва теми като доверие, сливане, уязвимост, сила и споделени ресурси.',
    9: 'Това положение търси растеж чрез знание, пътуване, убеждения и по-широка перспектива.',
    10: 'Това положение е насочено към призвание, обществен образ, отговорност и постижения.',
    11: 'Това положение се изразява чрез приятелства, общности, идеи за бъдещето и общи каузи.',
    12: 'Това положение работи през уединение, сънища, изцеление и скритите вътрешни процеси.',
}

const ASPECT_LABEL: Record<AspectData['aspect'], string> = {
    conjunction: 'Съединение',
    sextile: 'Секстил',
    square: 'Квадрат',
    trine: 'Тригон',
    opposition: 'Опозиция',
}

const ASPECT_TONE: Record<AspectData['aspect'], string> = {
    conjunction: 'се слива директно',
    sextile: 'получава подкрепа и възможност чрез',
    square: 'среща напрежение и натиск за развитие чрез',
    trine: 'тече естествено заедно',
    opposition: 'влиза в полярност и осъзнаване чрез',
}

const ASPECT_TONE_PREP: Record<AspectData['aspect'], 'с' | null> = {
    conjunction: 'с',
    sextile: null,
    square: null,
    trine: 'с',
    opposition: null,
}

function formatPosition(sign: string, degree?: number, house?: number): string {
    const signKey = sign.toLowerCase() as ZodiacSign
    const signName = ZODIAC_SIGNS_BG[signKey] || sign
    let position = signName

    if (degree !== undefined) {
        const degrees = Math.floor(degree)
        const minutes = Math.floor((degree - degrees) * 60)
        position = `${degrees}°${minutes.toString().padStart(2, '0')}' ${signName}`
    }

    if (house !== undefined) {
        position += `, Дом ${house}`
    }

    return position
}

function getAspectInsights(planet: Planet, aspects: AspectData[]): string[] {
    return aspects
        .map((aspect) => {
            const otherPlanetKey =
                aspect.planet1 === planet ? aspect.planet2 : aspect.planet1
            const otherPlanet = PLANETS_BG[otherPlanetKey as Planet] || otherPlanetKey
            const applyingText = aspect.applying
                ? 'Този аспект е по-активен и се усилва.'
                : 'Този аспект е по-устойчив и вече добре познат във вътрешния ти модел.'

            const tonePrep = ASPECT_TONE_PREP[aspect.aspect]
            const toneSuffix = tonePrep ? ` ${bgPrep(tonePrep, otherPlanet.toLowerCase())}` : ''
            return `${ASPECT_LABEL[aspect.aspect]} ${bgPrep('с', otherPlanet)} ${otherPlanet}. Тук това положение ${ASPECT_TONE[aspect.aspect]}${toneSuffix} ${otherPlanet.toLowerCase()}, с орб ${aspect.orb.toFixed(1)}°. ${applyingText}`
        })
        .slice(0, 3)
}

export function getPlanetInterpretation(planet: string, sign: string, degree?: number,
                                        house?: number, aspects: AspectData[] = []): InterpretationData {
    const planetKey = planet as Planet
    const signKey = sign.toLowerCase() as ZodiacSign

    const planetName = PLANETS_BG[planetKey] || planet
    const signName = ZODIAC_SIGNS_BG[signKey] || sign
    const title = `${planetName} ${bgPrep('в', signName)} ${signName}`
    const position = formatPosition(sign, degree, house)
    const brief = SIGN_BRIEF[signKey] || ''

    const houseLine = house
        ? HOUSE_MEANING[house]
        : 'Това положение се чете най-вече през природата на планетата и качеството на знака.'
    const overview = `${PLANET_OVERVIEW[planetKey]} ${SIGN_INFLECTION[signKey]} ${houseLine}`

    return {
        title,
        position,
        brief,
        overview,
        strengths: PLANET_STRENGTHS[planetKey] || [],
        challenges: PLANET_CHALLENGES[planetKey] || [],
        growth: `Зрелият израз на ${planetName.toLowerCase()} ${bgPrep('в', signName)} ${signName} идва, когато използваш силните му страни съзнателно, а не по навик. Търси по-зрялата версия на това положение: осъзнат отговор вместо автоматична реакция, вътрешна последователност вместо импулсивност и доверие вместо нужда от доказване.`,
        aspectInsights: getAspectInsights(planetKey, aspects),
    }
}

export function getRisingInterpretation(sign: string, degree?: number, isApproximate?: boolean): InterpretationData {
    const signKey = sign.toLowerCase() as ZodiacSign
    const signName = ZODIAC_SIGNS_BG[signKey] || sign

    return {
        title: isApproximate ? 'Приблизителен асцендент' : 'Асцендент',
        position: formatPosition(sign, degree),
        brief: SIGN_BRIEF[signKey] || '',
        overview: `Асцендентът описва първото впечатление, езика на тялото, инстинктивния подход и атмосферата, която носиш в нови ситуации. ${SIGN_INFLECTION[signKey]} Често това е първият слой, който другите забелязват, преди да усетят по-дълбоката история на Слънцето и Луната.${isApproximate ? ' Понеже часът на раждане не е точен, приемай тази насока като ориентир, а не като абсолютна сигурност.' : ''}`,
        strengths: [
            'естествен стил на първо впечатление',
            'ясен социален тон, който околните улавят бързо',
            'инстинктивен начин да навлизаш в нови ситуации',
        ],
        challenges: [
            'другите да те възприемат само през външната маска',
            'прекалено разчитане на навичен социален стил',
            'объркване между първична реакция и по-дълбока истина',
        ],
        growth: 'Използвай асцендента като вход към света, но не като цялата си самоличност. Той е начинът, по който започваш, ориентираш се и се появяваш, но става най-силен, когато е свързан с вътрешната ти истина.',
        aspectInsights: [],
    }
}

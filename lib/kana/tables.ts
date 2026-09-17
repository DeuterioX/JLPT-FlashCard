export type KanaCard = { prompt: string; romaji: string[] };
export type KanaGroup = { name: string; section: string; cards: KanaCard[] };

/** Atajo: una carta con una sola romanización. */
const c = (prompt: string, romaji: string): KanaCard => ({ prompt, romaji: [romaji] });
/** Atajo: una carta con romanizaciones alternativas aceptadas. */
const m = (prompt: string, ...romaji: string[]): KanaCard => ({ prompt, romaji });

const g = (name: string, section: string, cards: KanaCard[]): KanaGroup => ({ name, section, cards });

export const HIRAGANA: KanaGroup[] = [
  g('あ行', 'Básicos', [c('あ','a'), c('い','i'), c('う','u'), c('え','e'), c('お','o')]),
  g('か行', 'Básicos', [c('か','ka'), c('き','ki'), c('く','ku'), c('け','ke'), c('こ','ko')]),
  g('さ行', 'Básicos', [c('さ','sa'), m('し','shi','si'), c('す','su'), c('せ','se'), c('そ','so')]),
  g('た行', 'Básicos', [c('た','ta'), m('ち','chi','ti'), m('つ','tsu','tu'), c('て','te'), c('と','to')]),
  g('な行', 'Básicos', [c('な','na'), c('に','ni'), c('ぬ','nu'), c('ね','ne'), c('の','no')]),
  g('は行', 'Básicos', [c('は','ha'), c('ひ','hi'), m('ふ','fu','hu'), c('へ','he'), c('ほ','ho')]),
  g('ま行', 'Básicos', [c('ま','ma'), c('み','mi'), c('む','mu'), c('め','me'), c('も','mo')]),
  g('や行', 'Básicos', [c('や','ya'), c('ゆ','yu'), c('よ','yo')]),
  g('ら行', 'Básicos', [c('ら','ra'), c('り','ri'), c('る','ru'), c('れ','re'), c('ろ','ro')]),
  g('わ行', 'Básicos', [c('わ','wa'), m('を','wo','o'), m('ん','n','nn')]),

  g('が行', 'Dakuten', [c('が','ga'), c('ぎ','gi'), c('ぐ','gu'), c('げ','ge'), c('ご','go')]),
  g('ざ行', 'Dakuten', [c('ざ','za'), m('じ','ji','zi'), c('ず','zu'), c('ぜ','ze'), c('ぞ','zo')]),
  g('だ行', 'Dakuten', [c('だ','da'), m('ぢ','ji','di','zi'), m('づ','zu','du'), c('で','de'), c('ど','do')]),
  g('ば行', 'Dakuten', [c('ば','ba'), c('び','bi'), c('ぶ','bu'), c('べ','be'), c('ぼ','bo')]),
  g('ぱ行', 'Dakuten', [c('ぱ','pa'), c('ぴ','pi'), c('ぷ','pu'), c('ぺ','pe'), c('ぽ','po')]),

  g('きゃ行', 'Contracciones', [c('きゃ','kya'), c('きゅ','kyu'), c('きょ','kyo')]),
  g('しゃ行', 'Contracciones', [m('しゃ','sha','sya'), m('しゅ','shu','syu'), m('しょ','sho','syo')]),
  g('ちゃ行', 'Contracciones', [m('ちゃ','cha','tya'), m('ちゅ','chu','tyu'), m('ちょ','cho','tyo')]),
  g('にゃ行', 'Contracciones', [c('にゃ','nya'), c('にゅ','nyu'), c('にょ','nyo')]),
  g('ひゃ行', 'Contracciones', [c('ひゃ','hya'), c('ひゅ','hyu'), c('ひょ','hyo')]),
  g('みゃ行', 'Contracciones', [c('みゃ','mya'), c('みゅ','myu'), c('みょ','myo')]),
  g('りゃ行', 'Contracciones', [c('りゃ','rya'), c('りゅ','ryu'), c('りょ','ryo')]),
  g('ぎゃ行', 'Contracciones', [c('ぎゃ','gya'), c('ぎゅ','gyu'), c('ぎょ','gyo')]),
  g('じゃ行', 'Contracciones', [m('じゃ','ja','zya','jya'), m('じゅ','ju','zyu','jyu'), m('じょ','jo','zyo','jyo')]),
  g('びゃ行', 'Contracciones', [c('びゃ','bya'), c('びゅ','byu'), c('びょ','byo')]),
  g('ぴゃ行', 'Contracciones', [c('ぴゃ','pya'), c('ぴゅ','pyu'), c('ぴょ','pyo')]),
];

export const KATAKANA: KanaGroup[] = [
  g('ア行', 'Básicos', [c('ア','a'), c('イ','i'), c('ウ','u'), c('エ','e'), c('オ','o')]),
  g('カ行', 'Básicos', [c('カ','ka'), c('キ','ki'), c('ク','ku'), c('ケ','ke'), c('コ','ko')]),
  g('サ行', 'Básicos', [c('サ','sa'), m('シ','shi','si'), c('ス','su'), c('セ','se'), c('ソ','so')]),
  g('タ行', 'Básicos', [c('タ','ta'), m('チ','chi','ti'), m('ツ','tsu','tu'), c('テ','te'), c('ト','to')]),
  g('ナ行', 'Básicos', [c('ナ','na'), c('ニ','ni'), c('ヌ','nu'), c('ネ','ne'), c('ノ','no')]),
  g('ハ行', 'Básicos', [c('ハ','ha'), c('ヒ','hi'), m('フ','fu','hu'), c('ヘ','he'), c('ホ','ho')]),
  g('マ行', 'Básicos', [c('マ','ma'), c('ミ','mi'), c('ム','mu'), c('メ','me'), c('モ','mo')]),
  g('ヤ行', 'Básicos', [c('ヤ','ya'), c('ユ','yu'), c('ヨ','yo')]),
  g('ラ行', 'Básicos', [c('ラ','ra'), c('リ','ri'), c('ル','ru'), c('レ','re'), c('ロ','ro')]),
  g('ワ行', 'Básicos', [c('ワ','wa'), m('ヲ','wo','o'), m('ン','n','nn')]),

  g('ガ行', 'Dakuten', [c('ガ','ga'), c('ギ','gi'), c('グ','gu'), c('ゲ','ge'), c('ゴ','go')]),
  g('ザ行', 'Dakuten', [c('ザ','za'), m('ジ','ji','zi'), c('ズ','zu'), c('ゼ','ze'), c('ゾ','zo')]),
  g('ダ行', 'Dakuten', [c('ダ','da'), m('ヂ','ji','di','zi'), m('ヅ','zu','du'), c('デ','de'), c('ド','do')]),
  g('バ行', 'Dakuten', [c('バ','ba'), c('ビ','bi'), c('ブ','bu'), c('ベ','be'), c('ボ','bo')]),
  g('パ行', 'Dakuten', [c('パ','pa'), c('ピ','pi'), c('プ','pu'), c('ペ','pe'), c('ポ','po')]),

  g('キャ行', 'Contracciones', [c('キャ','kya'), c('キュ','kyu'), c('キョ','kyo')]),
  g('シャ行', 'Contracciones', [m('シャ','sha','sya'), m('シュ','shu','syu'), m('ショ','sho','syo')]),
  g('チャ行', 'Contracciones', [m('チャ','cha','tya'), m('チュ','chu','tyu'), m('チョ','cho','tyo')]),
  g('ニャ行', 'Contracciones', [c('ニャ','nya'), c('ニュ','nyu'), c('ニョ','nyo')]),
  g('ヒャ行', 'Contracciones', [c('ヒャ','hya'), c('ヒュ','hyu'), c('ヒョ','hyo')]),
  g('ミャ行', 'Contracciones', [c('ミャ','mya'), c('ミュ','myu'), c('ミョ','myo')]),
  g('リャ行', 'Contracciones', [c('リャ','rya'), c('リュ','ryu'), c('リョ','ryo')]),
  g('ギャ行', 'Contracciones', [c('ギャ','gya'), c('ギュ','gyu'), c('ギョ','gyo')]),
  g('ジャ行', 'Contracciones', [m('ジャ','ja','zya','jya'), m('ジュ','ju','zyu','jyu'), m('ジョ','jo','zyo','jyo')]),
  g('ビャ行', 'Contracciones', [c('ビャ','bya'), c('ビュ','byu'), c('ビョ','byo')]),
  g('ピャ行', 'Contracciones', [c('ピャ','pya'), c('ピュ','pyu'), c('ピョ','pyo')]),

  // Préstamos del inglés y otros idiomas. No existen en hiragana.
  g('ファ行', 'Extendidos', [c('ファ','fa'), c('フィ','fi'), c('フェ','fe'), c('フォ','fo')]),
  g('ヴァ行', 'Extendidos', [c('ヴァ','va'), c('ヴィ','vi'), c('ヴ','vu'), c('ヴェ','ve'), c('ヴォ','vo')]),
  g('ティ行', 'Extendidos', [c('ティ','ti'), c('トゥ','tu'), c('ディ','di'), c('ドゥ','du')]),
  g('ウィ行', 'Extendidos', [c('ウィ','wi'), c('ウェ','we'), c('ウォ','wo')]),
  g('シェ行', 'Extendidos', [c('シェ','she'), c('ジェ','je'), c('チェ','che')]),
  g('ツァ行', 'Extendidos', [c('ツァ','tsa'), c('ツィ','tsi'), c('ツェ','tse'), c('ツォ','tso')]),
  g('クァ行', 'Extendidos', [c('クァ','kwa'), c('クィ','kwi'), c('クェ','kwe'), c('クォ','kwo')]),
];

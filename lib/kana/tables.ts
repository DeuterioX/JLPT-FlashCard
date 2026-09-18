export type KanaCard = { prompt: string; romaji: string[] };
export type KanaGroup = { name: string; section: string; cards: KanaCard[] };

/** Atajo: una carta con una sola romanización. */
const c = (prompt: string, romaji: string): KanaCard => ({ prompt, romaji: [romaji] });
/** Atajo: una carta con romanizaciones alternativas aceptadas. */
const m = (prompt: string, ...romaji: string[]): KanaCard => ({ prompt, romaji });

const g = (name: string, section: string, cards: KanaCard[]): KanaGroup => ({ name, section, cards });

export const HIRAGANA: KanaGroup[] = [
  g('Serie A', 'Básicos', [c('あ','a'), c('い','i'), c('う','u'), c('え','e'), c('お','o')]),
  g('Serie K', 'Básicos', [c('か','ka'), c('き','ki'), c('く','ku'), c('け','ke'), c('こ','ko')]),
  g('Serie S', 'Básicos', [c('さ','sa'), m('し','shi','si'), c('す','su'), c('せ','se'), c('そ','so')]),
  g('Serie T', 'Básicos', [c('た','ta'), m('ち','chi','ti'), m('つ','tsu','tu'), c('て','te'), c('と','to')]),
  g('Serie N', 'Básicos', [c('な','na'), c('に','ni'), c('ぬ','nu'), c('ね','ne'), c('の','no')]),
  g('Serie H', 'Básicos', [c('は','ha'), c('ひ','hi'), m('ふ','fu','hu'), c('へ','he'), c('ほ','ho')]),
  g('Serie M', 'Básicos', [c('ま','ma'), c('み','mi'), c('む','mu'), c('め','me'), c('も','mo')]),
  g('Serie Y', 'Básicos', [c('や','ya'), c('ゆ','yu'), c('よ','yo')]),
  g('Serie R', 'Básicos', [c('ら','ra'), c('り','ri'), c('る','ru'), c('れ','re'), c('ろ','ro')]),
  g('Serie W', 'Básicos', [c('わ','wa'), m('を','wo','o'), m('ん','n','nn')]),

  g('Serie G', 'Dakuten', [c('が','ga'), c('ぎ','gi'), c('ぐ','gu'), c('げ','ge'), c('ご','go')]),
  g('Serie Z', 'Dakuten', [c('ざ','za'), m('じ','ji','zi'), c('ず','zu'), c('ぜ','ze'), c('ぞ','zo')]),
  g('Serie D', 'Dakuten', [c('だ','da'), m('ぢ','ji','di','zi'), m('づ','zu','du'), c('で','de'), c('ど','do')]),
  g('Serie B', 'Dakuten', [c('ば','ba'), c('び','bi'), c('ぶ','bu'), c('べ','be'), c('ぼ','bo')]),
  g('Serie P', 'Dakuten', [c('ぱ','pa'), c('ぴ','pi'), c('ぷ','pu'), c('ぺ','pe'), c('ぽ','po')]),

  g('Serie KY', 'Contracciones', [c('きゃ','kya'), c('きゅ','kyu'), c('きょ','kyo')]),
  g('Serie SH', 'Contracciones', [m('しゃ','sha','sya'), m('しゅ','shu','syu'), m('しょ','sho','syo')]),
  g('Serie CH', 'Contracciones', [m('ちゃ','cha','tya'), m('ちゅ','chu','tyu'), m('ちょ','cho','tyo')]),
  g('Serie NY', 'Contracciones', [c('にゃ','nya'), c('にゅ','nyu'), c('にょ','nyo')]),
  g('Serie HY', 'Contracciones', [c('ひゃ','hya'), c('ひゅ','hyu'), c('ひょ','hyo')]),
  g('Serie MY', 'Contracciones', [c('みゃ','mya'), c('みゅ','myu'), c('みょ','myo')]),
  g('Serie RY', 'Contracciones', [c('りゃ','rya'), c('りゅ','ryu'), c('りょ','ryo')]),
  g('Serie GY', 'Contracciones', [c('ぎゃ','gya'), c('ぎゅ','gyu'), c('ぎょ','gyo')]),
  g('Serie J', 'Contracciones', [m('じゃ','ja','zya','jya'), m('じゅ','ju','zyu','jyu'), m('じょ','jo','zyo','jyo')]),
  g('Serie BY', 'Contracciones', [c('びゃ','bya'), c('びゅ','byu'), c('びょ','byo')]),
  g('Serie PY', 'Contracciones', [c('ぴゃ','pya'), c('ぴゅ','pyu'), c('ぴょ','pyo')]),
];

export const KATAKANA: KanaGroup[] = [
  g('Serie A', 'Básicos', [c('ア','a'), c('イ','i'), c('ウ','u'), c('エ','e'), c('オ','o')]),
  g('Serie K', 'Básicos', [c('カ','ka'), c('キ','ki'), c('ク','ku'), c('ケ','ke'), c('コ','ko')]),
  g('Serie S', 'Básicos', [c('サ','sa'), m('シ','shi','si'), c('ス','su'), c('セ','se'), c('ソ','so')]),
  g('Serie T', 'Básicos', [c('タ','ta'), m('チ','chi','ti'), m('ツ','tsu','tu'), c('テ','te'), c('ト','to')]),
  g('Serie N', 'Básicos', [c('ナ','na'), c('ニ','ni'), c('ヌ','nu'), c('ネ','ne'), c('ノ','no')]),
  g('Serie H', 'Básicos', [c('ハ','ha'), c('ヒ','hi'), m('フ','fu','hu'), c('ヘ','he'), c('ホ','ho')]),
  g('Serie M', 'Básicos', [c('マ','ma'), c('ミ','mi'), c('ム','mu'), c('メ','me'), c('モ','mo')]),
  g('Serie Y', 'Básicos', [c('ヤ','ya'), c('ユ','yu'), c('ヨ','yo')]),
  g('Serie R', 'Básicos', [c('ラ','ra'), c('リ','ri'), c('ル','ru'), c('レ','re'), c('ロ','ro')]),
  g('Serie W', 'Básicos', [c('ワ','wa'), m('ヲ','wo','o'), m('ン','n','nn')]),

  g('Serie G', 'Dakuten', [c('ガ','ga'), c('ギ','gi'), c('グ','gu'), c('ゲ','ge'), c('ゴ','go')]),
  g('Serie Z', 'Dakuten', [c('ザ','za'), m('ジ','ji','zi'), c('ズ','zu'), c('ゼ','ze'), c('ゾ','zo')]),
  g('Serie D', 'Dakuten', [c('ダ','da'), m('ヂ','ji','di','zi'), m('ヅ','zu','du'), c('デ','de'), c('ド','do')]),
  g('Serie B', 'Dakuten', [c('バ','ba'), c('ビ','bi'), c('ブ','bu'), c('ベ','be'), c('ボ','bo')]),
  g('Serie P', 'Dakuten', [c('パ','pa'), c('ピ','pi'), c('プ','pu'), c('ペ','pe'), c('ポ','po')]),

  g('Serie KY', 'Contracciones', [c('キャ','kya'), c('キュ','kyu'), c('キョ','kyo')]),
  g('Serie SH', 'Contracciones', [m('シャ','sha','sya'), m('シュ','shu','syu'), m('ショ','sho','syo')]),
  g('Serie CH', 'Contracciones', [m('チャ','cha','tya'), m('チュ','chu','tyu'), m('チョ','cho','tyo')]),
  g('Serie NY', 'Contracciones', [c('ニャ','nya'), c('ニュ','nyu'), c('ニョ','nyo')]),
  g('Serie HY', 'Contracciones', [c('ヒャ','hya'), c('ヒュ','hyu'), c('ヒョ','hyo')]),
  g('Serie MY', 'Contracciones', [c('ミャ','mya'), c('ミュ','myu'), c('ミョ','myo')]),
  g('Serie RY', 'Contracciones', [c('リャ','rya'), c('リュ','ryu'), c('リョ','ryo')]),
  g('Serie GY', 'Contracciones', [c('ギャ','gya'), c('ギュ','gyu'), c('ギョ','gyo')]),
  g('Serie J', 'Contracciones', [m('ジャ','ja','zya','jya'), m('ジュ','ju','zyu','jyu'), m('ジョ','jo','zyo','jyo')]),
  g('Serie BY', 'Contracciones', [c('ビャ','bya'), c('ビュ','byu'), c('ビョ','byo')]),
  g('Serie PY', 'Contracciones', [c('ピャ','pya'), c('ピュ','pyu'), c('ピョ','pyo')]),

  // Préstamos del inglés y otros idiomas. No existen en hiragana.
  g('Serie FA', 'Extendidos', [c('ファ','fa'), c('フィ','fi'), c('フェ','fe'), c('フォ','fo')]),
  g('Serie VA', 'Extendidos', [c('ヴァ','va'), c('ヴィ','vi'), c('ヴ','vu'), c('ヴェ','ve'), c('ヴォ','vo')]),
  g('Serie TI', 'Extendidos', [c('ティ','ti'), c('トゥ','tu'), c('ディ','di'), c('ドゥ','du')]),
  g('Serie WI', 'Extendidos', [c('ウィ','wi'), c('ウェ','we'), c('ウォ','wo')]),
  g('Serie SHE', 'Extendidos', [c('シェ','she'), c('ジェ','je'), c('チェ','che')]),
  g('Serie TSA', 'Extendidos', [c('ツァ','tsa'), c('ツィ','tsi'), c('ツェ','tse'), c('ツォ','tso')]),
  g('Serie KWA', 'Extendidos', [c('クァ','kwa'), c('クィ','kwi'), c('クェ','kwe'), c('クォ','kwo')]),
];

# -*- coding: utf-8 -*-
"""Datos reales de la base del usuario. Nada inventado."""

SERIES = [
    ('Serie A', [('あ', 'a'), ('い', 'i'), ('う', 'u'), ('え', 'e'), ('お', 'o')]),
    ('Serie K', [('か', 'ka'), ('き', 'ki'), ('く', 'ku'), ('け', 'ke'), ('こ', 'ko')]),
    ('Serie S', [('さ', 'sa'), ('し', 'shi'), ('す', 'su'), ('せ', 'se'), ('そ', 'so')]),
    ('Serie T', [('た', 'ta'), ('ち', 'chi'), ('つ', 'tsu'), ('て', 'te'), ('と', 'to')]),
    ('Serie N', [('な', 'na'), ('に', 'ni'), ('ぬ', 'nu'), ('ね', 'ne'), ('の', 'no')]),
    ('Serie H', [('は', 'ha'), ('ひ', 'hi'), ('ふ', 'fu'), ('へ', 'he'), ('ほ', 'ho')]),
    ('Serie M', [('ま', 'ma'), ('み', 'mi'), ('む', 'mu'), ('め', 'me'), ('も', 'mo')]),
    ('Serie Y', [('や', 'ya'), ('ゆ', 'yu'), ('よ', 'yo')]),
    ('Serie R', [('ら', 'ra'), ('り', 'ri'), ('る', 'ru'), ('れ', 're'), ('ろ', 'ro')]),
    ('Serie W', [('わ', 'wa'), ('を', 'wo'), ('ん', 'n')]),
    ('Serie G', [('が', 'ga'), ('ぎ', 'gi'), ('ぐ', 'gu'), ('げ', 'ge'), ('ご', 'go')]),
    ('Serie Z', [('ざ', 'za'), ('じ', 'ji'), ('ず', 'zu'), ('ぜ', 'ze'), ('ぞ', 'zo')]),
]
ENCENDIDAS = {0, 1, 2, 4}

# Unidad 1 de Minna no Nihongo I: las seis primeras, tal cual están cargadas.
PALABRAS = [
    ('がくせい', 'gakusei', 'Estudiante'),
    ('かいしゃいん', 'kaishain', 'Empleado de empresa'),
    ('ぎんこういん', 'ginkouin', 'Empleado bancario'),
    ('いしゃ', 'isha', 'Doctor, médico'),
    ('けんきゅうしゃ', 'kenkyuusha', 'Investigador'),
    ('だいがく', 'daigaku', 'Universidad'),
    ('びょういん', 'byouin', 'Hospital'),
    ('アメリカ', 'amerika', 'Estados unidos'),
    ('イギリス', 'igirisu', 'Reino unido'),
    ('インド', 'indo', 'India'),
]

# El caso peor del mazo: frases largas.
EXPRESIONES = [
    ('はじめましょう', 'hajimemashou'), ('おわりましょう', 'owarimashou'),
    ('やすみましょう', 'yasumimashou'), ('わかりますか', 'wakarimasuka'),
    ('はい, わかります', 'hai, wakarimasu'), ('いいえ, わかりません', 'iie, wakarimasen'),
]

MAZOS = [
    ('Hiragana', '26 grupos · 104 cartas · básicos, dakuten, contracciones', True),
    ('Katakana', '33 grupos · 131 cartas · básicos, dakuten, contracciones, extendidos', True),
    ('Minna no Nihongo I', '62 grupos · 598 cartas · lección 1, lección 2, lección 3, lección 4…', True),
]

GRUPOS_MINNA = [
    ('Unidad 1', 30), ('Unidad 2', 29), ('Unidad 3', 34),
    ('Unidad 3 - Gran almacén', 23), ('Expresiones de uso en clase', 33),
]

# Las ocho que muestra el panel, tal cual salen de la app.
PEORES = [('ほ', 'ho', 6, 8), ('く', 'ku', 10, 19), ('や', 'ya', 4, 8),
          ('む', 'mu', 5, 10), ('め', 'me', 4, 8), ('け', 'ke', 9, 20),
          ('お', 'o', 8, 22), ('れ', 're', 2, 6)]

HISTORIAL = [('21/9 14:57', '0:01', 83), ('21/9 01:42', '0:40', 83),
             ('21/9 01:04', '0:09', 100), ('19/9 23:43', '28:52', 83),
             ('19/9 19:38', '0:13', 38), ('19/9 19:36', '0:09', 45),
             ('19/9 19:27', '2:26', 77)]

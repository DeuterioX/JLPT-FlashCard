# -*- coding: utf-8 -*-
"""Reescribe `mod_dict` con la estructura de fila de la app real."""
import io

NUEVO = '''def mod_dict(w, h):
    """El buscador, con la estructura de fila que ya tiene la app: arriba kana,
    kanji, romaji y el botón de agregar; abajo el significado y la categoría.
    Dos líneas por resultado, que es lo que lo hace legible en un teléfono: en
    cuatro columnas los glosas se parten en tres renglones cada uno."""
    movil = w < 600
    # resultados reales de buscar «pescado»
    res = [('さかな', '魚', 'sakana', 'pescado', 'sustantivo'),
           ('りょうし', '漁師', 'ryoushi', 'pescador', 'sustantivo'),
           ('ぎょみん', '漁民', 'gyomin', 'pescadores', 'sustantivo'),
           ('せんぎょ', '鮮魚', 'sengyo', 'pescado fresco', 'sustantivo'),
           ('とる', '捕る', 'toru', 'atrapar (pescado)', 'verbo'),
           ('ぎょにく', '魚肉', 'gyoniku', 'carne de pescado', 'sustantivo'),
           ('さかなや', '魚屋', 'sakanaya', 'vendedor de pescados', 'sustantivo'),
           ('さんまい', '三枚', 'sanmai', 'fileteando (un pescado)', 'sustantivo')]
    if not movil:
        res = res + [('さしみ', '刺身', 'sashimi', 'pescado crudo en rajas', 'sustantivo'),
                     ('おろす', '下ろす', 'orosu', 'cortar en filetes', 'verbo')]

    filas = ''
    for i, (kana, kanji, rom, glosa, pos) in enumerate(res):
        borde = f'border-top: 1px solid {P["ink5"]}; ' if i else ''
        filas += (f'<div style="{borde}padding: 10px 14px; display: flex; flex-direction: column; gap: 2px">'
                  f'<span style="display: flex; align-items: center; gap: 10px">'
                  f'<span style="font-family: {KANA}; font-size: 16px; color: {P["ink0"]}">{kana}</span>'
                  f'<span style="font-family: {KANA}; font-size: 15px; color: {P["ink3"]}">{kanji}</span>'
                  f'<span style="font-family: {MONO}; font-size: 13px; color: {P["ink2"]}; '
                  f'flex: 1; min-width: 0">{rom}</span>'
                  f'{boton("Agregar", "primario", h=30, fs=13)}</span>'
                  f'<span style="display: flex; align-items: baseline; gap: 10px">'
                  f'<span style="flex: 1; min-width: 0; font-size: 13.5px; color: {P["ink2"]}">{glosa}</span>'
                  f'<span style="font-size: 11.5px; font-style: italic; color: {P["ink3"]}; '
                  f'flex: none">{pos}</span></span></div>')

    busca = (f'<div style="padding: 12px 14px">'
             f'<span style="display: flex; align-items: center; gap: 10px; height: 40px; '
             f'padding: 0 14px; border-radius: 8px; background: {P["papel"]}; '
             f'border: 1.5px solid {P["sumi"]}; box-shadow: 0 0 0 3px rgba(196,64,46,.22)">'
             f'<span style="flex: 1; font-size: 16px; color: {P["sumi"]}">pescado</span>'
             f'<span style="font-family: {MONO}; font-size: 12px; color: {P["sumiDim"]}">30</span>'
             f'</span></div>')

    pie = (f'<div style="padding: 11px 14px; border-top: 1px solid {P["ink5"]}; '
           f'background: {P["ink6"]}; font-size: 11.5px; line-height: 1.5; color: {P["ink3"]}">'
           f'Se agrega al grupo <b style="color: {P["ink0"]}; font-weight: 600">Unidad 1</b>. '
           f'Podés editar kana, romaji y significado después.</div>')

    if movil:
        # a pantalla completa debajo de la barra de la pantalla, como en la app
        cont = (f'<div style="position: absolute; left: 0; right: 0; top: 48px; bottom: 0; '
                f'background: {P["ink7"]}; display: flex; flex-direction: column">'
                f'{busca}<div style="flex: 1; overflow: hidden">{filas}</div>{pie}</div>')
        return marco(w, h, navbar_movil('Unidad 1', accion=boton('✕', h=30, fs=14)) + cont)

    cuerpo = (f'<div style="margin: -16px">{busca}'
              f'<div style="border-top: 1px solid {P["ink5"]}">{filas}</div>{pie}</div>')
    return velo(w, h, fondo_cartas(w, h), modal('辞 · Diccionario', cuerpo, 720, w))
'''

p = 'build.py'
s = io.open(p, encoding='utf-8').read()
i = s.index('def mod_dict(')
j = s.index('# ---------------------------------------------------------------- ANIMACIONES')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s[:i] + NUEVO + '\n\n' + s[j:])
print('mod_dict reescrito')

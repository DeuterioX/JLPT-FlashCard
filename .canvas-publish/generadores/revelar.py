# -*- coding: utf-8 -*-
"""El revelar de Significados: el significado sube y entra, la hoja no gira."""
import io

NUEVA = '''def anim_revelar(w, h):
    """El revelar de Significados: 180 ms, el significado sube y entra."""
    pasos = [(0, 0.0, 10, 'oculto'), (60, 0.25, 6, '60 ms'),
             (120, 0.70, 2, '120 ms'), (180, 1.0, 0, '180 ms · revelado')]
    cuadros = ''
    for ms, op, dy, rot in pasos:
        celdas = ''
        for k in 'けんきゅうしゃ':
            celdas += (f'<span style="width: 34px; height: 34px; position: relative; display: grid; '
                       f'place-items: center; border: 1px solid rgba(25,23,19,.16); '
                       f'border-left: none; flex: none">'
                       f'<span style="position: absolute; left: 50%; top: 8%; bottom: 8%; width: 1px; '
                       f'background: rgba(160,66,50,.20)"></span>'
                       f'<span style="position: absolute; top: 50%; left: 8%; right: 8%; height: 1px; '
                       f'background: rgba(160,66,50,.20)"></span>'
                       f'<span style="font-family: {MINCHO}; font-size: 21px; line-height: 1; '
                       f'color: {P["sumi"]}">{k}</span></span>')
        hoja = (f'<div style="display: flex; background: {P["papel"]}; border-left: 1px solid '
                f'rgba(25,23,19,.16); border-radius: 3px; overflow: hidden; '
                f'box-shadow: {P["sombraHoja"]}">{celdas}</div>')
        cuadros += (f'<div style="display: flex; flex-direction: column; align-items: center; gap: 10px">'
                    f'<div style="width: 250px; height: 104px; display: flex; flex-direction: column; '
                    f'align-items: center; gap: 8px; padding-top: 4px">{hoja}'
                    f'<span style="display: flex; flex-direction: column; align-items: center; gap: 1px; '
                    f'opacity: {op}; transform: translateY({dy}px)">'
                    f'<span style="font-family: {MONO}; font-size: 11px; color: {P["ink2"]}">kenkyuusha</span>'
                    f'<span style="font-size: 18px; color: {P["ink0"]}">Investigador</span></span></div>'
                    f'<span style="font-family: {MONO}; font-size: 10px; color: {P["ink3"]}">{rot}</span>'
                    f'</div>')
    tira = f'<div style="display: flex; gap: 22px; align-items: flex-start">{cuadros}</div>'

    nota = (f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 76ch; line-height: 1.6">'
            f'La hoja <b style="color: {P["ink0"]}">no gira</b>. El giro de 翻 es del quiz, donde el kana se va '
            f'y entra la respuesta en su lugar; acá la palabra se queda y el significado aparece debajo, '
            f'porque lo que estás tratando de unir son las dos cosas a la vez.</p>'
            f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 76ch; line-height: 1.6">'
            f'Sube 10px y entra en opacidad, en <b style="color: {P["ink0"]}">180 ms</b> — menos de la mitad '
            f'que el giro, porque no hay nada que darse vuelta y en un repaso vas a apretar Revelar decenas '
            f'de veces por ronda. El hueco donde cae ya estaba reservado antes de revelar, así que la hoja '
            f'no se mueve ni un pixel: lo único que cambia es lo que aparece adentro del hueco.</p>'
            f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 76ch; line-height: 1.6">'
            f'Y es un interruptor: <b style="color: {P["ink0"]}">Ocultar</b> corre los mismos 180 ms al revés, '
            f'que es lo que deja taparse la respuesta y volver a probar sin salir de la carta.</p>')
    cuerpo = (f'<div style="padding: 32px; display: flex; flex-direction: column; gap: 22px">'
              f'<div style="display: flex; flex-direction: column; gap: 6px">'
              f'<span style="font-family: {MINCHO}; font-size: 22px">露 · Revelar el significado</span>'
              f'<span style="font-size: 12px; color: {P["ink3"]}">Significados · 180 ms</span></div>'
              f'{tira}{nota}</div>')
    return marco(w, h, cuerpo)


'''

p = 'build.py'
s = io.open(p, encoding='utf-8').read()
assert 'def anim_revelar(' not in s
s = s.replace('def anim_swipe(', NUEVA + 'def anim_swipe(', 1)

viejo = """FILAS_DEF.append(('Animaciones', [
    ('AnimGiro.dc.html', 'Revelar · 380 ms', anim_giro, (1240, 420)),
    ('AnimSwipe.dc.html', 'Gesto de fila', anim_swipe, (1240, 620)),
], 620))"""
nuevo = """FILAS_DEF.append(('Animaciones', [
    ('AnimGiro.dc.html', 'Revelar · 380 ms', anim_giro, (1240, 420)),
    ('AnimRevelar.dc.html', 'Revelar el significado · 180 ms', anim_revelar, (1240, 520)),
    ('AnimSwipe.dc.html', 'Gesto de fila', anim_swipe, (1240, 620)),
], 620))"""
assert viejo in s, 'no encontre la fila de animaciones'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok anim_revelar')

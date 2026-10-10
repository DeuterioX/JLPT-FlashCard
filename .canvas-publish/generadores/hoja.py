# -*- coding: utf-8 -*-
"""Reemplaza `hoja_quiz` por la versión de una celda por carácter."""
import io

NUEVA = '''def hoja_quiz(texto, lado_max, disponible):
    """La hoja de 原稿用紙: UNA CELDA POR CARÁCTER.

    El papel de manuscrito japonés es una grilla donde cada carácter ocupa su
    propio cuadro, y la cruz tenue de adentro sirve para centrar ESE trazo. Una
    celda sola funciona con あ y se rompe con けんきゅうしゃ: la palabra se parte
    encima de las guías y las guías dejan de querer decir algo.

    Con una celda por carácter, el kana suelto conserva su cuadro grande y la
    palabra larga se vuelve una tira de cuadros, que es exactamente como se ve
    una hoja de práctica. Los kana chicos -ゃ ゅ ょ っ- llevan celda propia, como
    en el papel de verdad.

    El lado se achica para que la tira entre en el ancho disponible y nunca
    pasa de `lado_max`. El carácter ocupa el 62% de su celda, como en el papel
    impreso.
    """
    chars = list(texto)
    n = len(chars)
    lado = min(lado_max, disponible / n)
    fuente = lado * 0.62
    celdas = ''
    for k, ch in enumerate(chars):
        sin_izq = '' if k == 0 else 'border-left: none; '
        celdas += (f'<span style="width: {lado:.1f}px; height: {lado:.1f}px; position: relative; '
                   f'display: grid; place-items: center; border: 1px solid rgba(25,23,19,.16); '
                   f'{sin_izq}flex: none">'
                   f'<span style="position: absolute; left: 50%; top: 8%; bottom: 8%; width: 1px; '
                   f'background: rgba(160,66,50,.20)"></span>'
                   f'<span style="position: absolute; top: 50%; left: 8%; right: 8%; height: 1px; '
                   f'background: rgba(160,66,50,.20)"></span>'
                   f'<span style="font-family: {MINCHO}; font-size: {fuente:.1f}px; line-height: 1; '
                   f'color: {P["sumi"]}; position: relative">{ch}</span></span>')
    return (f'<div style="display: flex; background: {P["papel"]}; border-radius: 3px; '
            f'box-shadow: 0 10px 30px rgba(0,0,0,.35); overflow: hidden">{celdas}</div>')


'''

p = 'lib.py'
s = io.open(p, encoding='utf-8').read()
i = s.index('def hoja_quiz(')
j = s.index('def _titulo_modal(')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s[:i] + NUEVA + s[j:])
print('hoja_quiz reemplazada')

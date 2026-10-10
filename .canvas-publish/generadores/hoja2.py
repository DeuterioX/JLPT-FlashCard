# -*- coding: utf-8 -*-
"""`hoja_quiz` con envoltura: la tira pasa a ser una grilla cuando la palabra
no entra en una fila con celdas legibles."""
import io

NUEVA = '''def hoja_quiz(texto, lado_max, disponible, lado_min=80):
    """La hoja de 原稿用紙: UNA CELDA POR CARÁCTER, y varias filas si hace falta.

    El papel de manuscrito japonés es una grilla donde cada carácter ocupa su
    propio cuadro, y la cruz tenue de adentro sirve para centrar ESE trazo. Una
    celda sola funciona con あ y se rompe con けんきゅうしゃ: la palabra se parte
    encima de las guías y las guías dejan de querer decir algo.

    Una sola fila tampoco alcanza. Achicando para que entre siempre, la frase
    más larga del mazo -これわ にほんごで なんと いいますか, 19 caracteres- daba
    celdas de 18px en teléfono, o sea letra de 11px. Por eso hay un piso:
    cuando la celda llegaría por debajo de `lado_min`, la hoja pasa a varias
    filas, que es lo que hace el papel de verdad. Las filas se reparten parejo
    -19 en dos filas son 10 y 9, no 12 y 7-.

    El espacio ocupa su propia celda, vacía, como en el papel impreso: es lo
    que deja ver dónde termina cada palabra de la frase.
    """
    import math
    chars = list(texto)
    n = len(chars)
    por_fila = max(1, int(disponible // lado_min))
    n_filas = max(1, math.ceil(n / por_fila))
    ancho_fila = math.ceil(n / n_filas)
    lado = min(lado_max, disponible / ancho_fila)
    fuente = lado * 0.62

    filas = []
    for f in range(n_filas):
        tramo = chars[f * ancho_fila:(f + 1) * ancho_fila]
        celdas = ''
        for k, ch in enumerate(tramo):
            sin_izq = '' if k == 0 else 'border-left: none; '
            sin_arriba = '' if f == 0 else 'border-top: none; '
            glifo = '' if ch == ' ' else (
                f'<span style="font-family: {MINCHO}; font-size: {fuente:.1f}px; line-height: 1; '
                f'color: {P["sumi"]}; position: relative">{ch}</span>')
            celdas += (f'<span style="width: {lado:.1f}px; height: {lado:.1f}px; position: relative; '
                       f'display: grid; place-items: center; border: 1px solid rgba(25,23,19,.16); '
                       f'{sin_izq}{sin_arriba}flex: none">'
                       f'<span style="position: absolute; left: 50%; top: 8%; bottom: 8%; width: 1px; '
                       f'background: rgba(160,66,50,.20)"></span>'
                       f'<span style="position: absolute; top: 50%; left: 8%; right: 8%; height: 1px; '
                       f'background: rgba(160,66,50,.20)"></span>{glifo}</span>')
        filas.append(f'<div style="display: flex">{celdas}</div>')

    return (f'<div style="display: flex; flex-direction: column; align-items: flex-start; '
            f'background: {P["papel"]}; border-radius: 3px; '
            f'box-shadow: 0 10px 30px rgba(0,0,0,.35); overflow: hidden">{"".join(filas)}</div>')


'''

p = 'lib.py'
s = io.open(p, encoding='utf-8').read()
i = s.index('def hoja_quiz(')
j = s.index('def _titulo_modal(')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s[:i] + NUEVA + s[j:])
print('hoja_quiz con envoltura')

# -*- coding: utf-8 -*-
"""Dos maquetas de la animación de revelar del quiz, para elegir entre ellas.

No son tiras de cuadros como las otras: ACÁ SE MUEVEN. La decisión es sobre
movimiento, y un movimiento no se juzga en fotos.

  · Mock 1 — la hoja entera gira sobre el eje X.
  · Mock 2 — gira cada celda por separado, también sobre X, una atrás de otra.

Las dos se muestran con los tres largos que la app tiene de verdad: un kana
solo, una palabra de un renglón y una frase de dos.
"""
import io
from lib import P, MINCHO, MONO, page

OUT = 'project'

# La partición es 1:1 a propósito: el dorso de cada celda es la lectura de ESE
# carácter, así el mock se puede juzgar sin discutir cómo se parte un romaji.
UNO = [('あ', 'a')]
PALABRA = [('え', 'e'), ('び', 'bi')]
FRASE = [('こ', 'ko'), ('れ', 're'), ('は', 'wa'), ('な', 'na'),
         ('ん', 'n'), ('で', 'de'), ('す', 'su'), ('か', 'ka')]


def cruz(lado):
    g = 100 / lado
    return ('<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" '
            'shape-rendering="geometricPrecision" '
            'style="position: absolute; inset: 0; width: 100%; height: 100%">'
            f'<line x1="50" y1="8" x2="50" y2="92" stroke="rgba(160,66,50,.20)" stroke-width="{g:.4f}"/>'
            f'<line x1="8" y1="50" x2="92" y2="50" stroke="rgba(160,66,50,.20)" stroke-width="{g:.4f}"/>'
            '</svg>')


def glifo(ch, lado):
    return (f'<span style="font-family: {MINCHO}; font-size: {lado * 0.62:.0f}px; line-height: 1; '
            f'color: {P["sumi"]}; position: relative">{ch}</span>')


def lectura(txt, lado):
    return (f'<span style="font-family: {MONO}; font-size: {lado * 0.30:.0f}px; line-height: 1; '
            f'color: {P["sumi"]}; position: relative">{txt}</span>')


def ejemplo(titulo, pares, lado, por_fila, modo):
    """`modo`: 'todo' gira la hoja entera, 'uno' gira celda por celda."""
    celdas = ''
    for i, (ch, r) in enumerate(pares):
        retardo = f' style="animation-delay: {i * 90}ms"' if modo == 'uno' else ''
        celdas += (f'<div class="celda"{retardo}>'
                   f'<div class="cara">{cruz(lado)}{glifo(ch, lado)}</div>'
                   f'<div class="cara dorso">{cruz(lado)}{lectura(r, lado)}</div>'
                   f'</div>')
    cols = min(por_fila, len(pares))
    grilla = (f'<div class="hoja" style="grid-template-columns: repeat({cols}, {lado}px); '
              f'--lado: {lado}px">{celdas}</div>')
    if modo == 'todo':
        grilla = f'<div class="giro">{grilla}</div>'
    rom = ' '.join(r for _, r in pares)
    return (f'<div class="ej"><div class="escena">{grilla}</div>'
            f'<span class="rot">{titulo}</span>'
            f'<span class="rom">{rom}</span></div>')


def css(modo):
    # En el modo 'uno' la animación cuelga de CADA celda; en 'todo', de la hoja.
    quien = '.celda' if modo == 'uno' else '.giro'
    return f"""
.ej {{ display: flex; flex-direction: column; align-items: center; gap: 12px; }}
.escena {{ perspective: 1400px; display: grid; place-items: center; }}
.hoja {{ display: grid; gap: 1px; padding: 1px; background: rgba(25,23,19,.16);
         border-radius: 3px; box-shadow: {P['sombraCuadro']}; transform-style: preserve-3d; }}
.celda {{ position: relative; width: var(--lado); height: var(--lado);
          transform-style: preserve-3d; }}
.cara {{ position: absolute; inset: 0; display: grid; place-items: center;
         background: {P['papel']};
         backface-visibility: hidden; -webkit-backface-visibility: hidden; }}
.cara.dorso {{ transform: rotateX(180deg); }}
.giro {{ transform-style: preserve-3d; }}
.rot {{ font-size: 11.5px; color: {P['ink2']}; }}
.rom {{ font-family: {MONO}; font-size: 10px; color: {P['ink3']}; letter-spacing: .04em; }}

/* El giro vive acá: sobre el eje X, o sea que la hoja cae hacia adelante y
   sube por atrás. El ciclo dura 3,2s para poder mirarlo; en la app el giro en
   sí dura 380ms y el resto es la pausa de cada lado. */
{quien} {{ animation: giroX 3200ms cubic-bezier(.45,.05,.35,1) infinite; }}
@keyframes giroX {{
  0%, 20%   {{ transform: rotateX(0deg); }}
  32%, 62%  {{ transform: rotateX(180deg); }}
  74%, 100% {{ transform: rotateX(360deg); }}
}}
"""


def tablero(w, h, modo, titulo, bajada, nota):
    ejs = (ejemplo('un kana', UNO, 132, 1, modo)
           + ejemplo('una palabra · un renglón', PALABRA, 104, 2, modo)
           + ejemplo('una frase · dos renglones', FRASE, 78, 4, modo))
    cuerpo = (f'<div style="padding: 32px; display: flex; flex-direction: column; gap: 26px; height: 100%">'
              f'<div style="display: flex; flex-direction: column; gap: 6px">'
              f'<span style="font-family: {MINCHO}; font-size: 22px">{titulo}</span>'
              f'<span style="font-size: 12px; color: {P["ink3"]}">{bajada}</span></div>'
              f'<div style="display: flex; gap: 56px; align-items: center; justify-content: center; flex: 1">'
              f'{ejs}</div>'
              f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 78ch; line-height: 1.6">'
              f'{nota}</p></div>')
    return f'<div class="f" style="width: {w}px; height: {h}px">{cuerpo}</div>'


def emitir(nombre, titulo, w, h, cuerpo, extra):
    io.open(f'{OUT}/{nombre}', 'w', encoding='utf-8', newline='\n').write(
        page(titulo, w, h, cuerpo, extra))


W, H = 1240, 700
A = f'<b style="color: {P["ink0"]}">'
Z = '</b>'

emitir('AnimGiroX.dc.html', 'Revelar · giro sobre X', W, H,
       tablero(W, H, 'todo', '翻 · Revelar · la hoja entera',
               'Mock 1 · rotateX sobre toda la hoja',
               f'La hoja completa gira sobre el eje {A}X{Z}: cae hacia adelante, pasa de canto y sube '
               f'por atrás con la lectura. Es {A}un solo objeto{Z}, así que la frase de dos renglones '
               f'gira como un bloque y los ocho caracteres se van juntos. Contra el {A}scaleX{Z} plano '
               f'que hubo hasta ahora, esto tiene volumen: la cruz de guía y la pauta acompañan el '
               f'giro en perspectiva en vez de aplastarse contra sí mismas.'),
       css('todo'))

emitir('AnimGiroXCelda.dc.html', 'Revelar · celda por celda', W, H,
       tablero(W, H, 'uno', '翻 · Revelar · celda por celda',
               'Mock 2 · rotateX por celda, 90 ms de diferencia',
               f'Gira {A}cada celda por separado{Z}, también sobre X, con 90 ms entre una y la '
               f'siguiente: la palabra se da vuelta de izquierda a derecha, como una fila de fichas. '
               f'Con un kana solo es idéntico al otro mock -no hay con qué escalonar-; la diferencia '
               f'aparece con la palabra y se vuelve el argumento principal con la frase, donde el '
               f'recorrido dice en qué orden se lee.'),
       css('uno'))
print('listo')

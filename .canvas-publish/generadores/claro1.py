# -*- coding: utf-8 -*-
"""Paso 1: la paleta pasa a ser intercambiable, y todo color que estaba
escrito a mano en el codigo pasa a ser un token. Los tableros oscuros tienen
que salir IDENTICOS despues de esto."""
import io

p = 'lib.py'
s = io.open(p, encoding='utf-8').read()

viejo = """P = dict(
    ink0='#EFEBE0', ink1='#CDD3C9', ink2='#9BA49B', ink3='#6E7570',
    ink4='#3A433D', ink5='#272E29', ink6='#1B211D', ink7='#111513',
    papel='#E8E1CF', papelOff='#8E897A',
    sumi='#191713', sumiDim='#5F594E',
    shu='#C4402E', verde='#4FA37B', verdeInk='#08170F',
)"""
nuevo = '''# Dos temas con los MISMOS nombres de token. Todo el resto del código lee
# `P[...]` y no sabe en cuál está: `tema()` cambia el contenido del diccionario
# en el lugar, así las referencias que ya importaron `P` siguen sirviendo.
#
# `ink0` es siempre el texto más fuerte e `ink7` el fondo de la página, en los
# dos temas: la escala no se invierte de nombre, se invierte de valor.
#
# Lo que NO cambia entre temas es el papel: `papel`, `sumi` y `sumiDim` son la
# hoja de 原稿用紙 y la tinta encima, y una hoja de papel no cambia de color
# porque la app esté en claro. `shu` tampoco: es el acento de la marca y en
# claro da 6,4:1 contra la página, así que no necesita una variante.
PALETA_OSCURA = dict(
    ink0='#EFEBE0', ink1='#CDD3C9', ink2='#9BA49B', ink3='#6E7570',
    ink4='#3A433D', ink5='#272E29', ink6='#1B211D', ink7='#111513',
    ink8='#0C0F0D', ink9='#080A09',
    papel='#E8E1CF', papelOff='#8E897A',
    papelInk='#23211C', papelInkDim='#3E3A33',
    sumi='#191713', sumiDim='#5F594E',
    shu='#C4402E', verde='#4FA37B', verdeInk='#08170F',
    # El verde lleno sirve de fondo en los dos temas, pero como TEXTO sobre
    # claro da 2,7:1 y no se puede leer. `verdeTxt` es el mismo verde bajado
    # hasta 4,7:1; en oscuro no hace falta y es el mismo.
    verdeTxt='#4FA37B', ambar='#C8A23E', ambarTxt='#C8A23E',
    scrim='rgba(8,10,9,.72)', scrimBase='8,10,9',
    sombraHoja='0 10px 30px rgba(0,0,0,.35)',
    sombraCuadro='0 6px 18px rgba(0,0,0,.35)',
    sombraModal='0 20px 60px rgba(0,0,0,.5)',
)

PALETA_CLARA = dict(
    ink0='#1B211D', ink1='#39423B', ink2='#5C655D', ink3='#8A928A',
    ink4='#CBD0C9', ink5='#E6E9E3', ink6='#FBFCF9', ink7='#F1F3EE',
    ink8='#FDFEFC', ink9='#FFFFFF',
    papel='#E8E1CF', papelOff='#DEDBD1',
    papelInk='#9A9488', papelInkDim='#AFA99C',
    sumi='#191713', sumiDim='#5F594E',
    shu='#C4402E', verde='#4FA37B', verdeInk='#08170F',
    verdeTxt='#2C7A54', ambar='#C8A23E', ambarTxt='#8A6A12',
    scrim='rgba(25,23,19,.38)', scrimBase='25,23,19',
    # Las sombras del tema oscuro son negro al 35 y al 50%: sobre una página
    # clara eso es una mancha. Acá son sumi a baja opacidad, que es lo que
    # hace una hoja apoyada sobre otra hoja.
    sombraHoja='0 8px 24px rgba(25,23,19,.14)',
    sombraCuadro='0 6px 18px rgba(25,23,19,.12)',
    sombraModal='0 18px 48px rgba(25,23,19,.18)',
)

P = dict(PALETA_OSCURA)


def tema(nombre):
    """Cambia el tema EN EL LUGAR, sin volver a ligar `P`.

    `gen.py` y `build.py` hacen `from lib import P`, o sea que tienen su
    propia referencia al mismo diccionario. Reasignar `lib.P` no las tocaría;
    vaciarlo y volverlo a llenar sí, porque todas apuntan al mismo objeto y
    todas leen `P[...]` en el momento de dibujar.
    """
    P.clear()
    P.update(PALETA_CLARA if nombre == 'claro' else PALETA_OSCURA)
    return nombre'''
assert viejo in s, 'no encontre la paleta'
s = s.replace(viejo, nuevo, 1)

# los colores escritos a mano pasan a token
cambios = [
    ("    tinta = P['sumi'] if on else '#23211C'\n"
     "    tintaR = P['sumiDim'] if on else '#3E3A33'",
     "    tinta = P['sumi'] if on else P['papelInk']\n"
     "    tintaR = P['sumiDim'] if on else P['papelInkDim']"),
    ("f'box-shadow: 0 10px 30px rgba(0,0,0,.35); overflow: hidden\">{\"\".join(filas)}</div>')",
     "f'box-shadow: {P[\"sombraHoja\"]}; overflow: hidden\">{\"\".join(filas)}</div>')"),
    ("f'<div style=\"position: absolute; inset: 0; background: rgba(8,10,9,.72); '",
     "f'<div style=\"position: absolute; inset: 0; background: {P[\"scrim\"]}; '"),
    ("f'box-shadow: 0 20px 60px rgba(0,0,0,.5)\">'",
     "f'box-shadow: {P[\"sombraModal\"]}\">'"),
    ("        col = P['verde'] if on else P['ink2']",
     "        col = P['verdeTxt'] if on else P['ink2']"),
]
for viejo, nuevo in cambios:
    assert viejo in s, f'no encontre: {viejo[:60]}'
    s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ------------------------------------------------------------------ gen.py
p = 'gen.py'
s = io.open(p, encoding='utf-8').read()
s = s.replace('from lib import (P, UI,', 'from lib import (P, tema, UI,', 1)

viejo = """    def tono(p):
        return P['verde'] if p >= 85 else ('#C8A23E' if p >= 60 else P['shu'])"""
nuevo = """    # Dos semáforos con los mismos cortes: uno para rellenos y otro para
    # texto. El verde y el ámbar llenos se ven bien en los dos temas, pero
    # como texto sobre claro dan 2,7:1 y 2,2:1 -ilegibles-, así que las
    # cifras usan las variantes bajadas.
    def tono(p):
        return P['verde'] if p >= 85 else (P['ambar'] if p >= 60 else P['shu'])

    def tono_txt(p):
        return P['verdeTxt'] if p >= 85 else (P['ambarTxt'] if p >= 60 else P['shu'])"""
assert viejo in s, 'no encontre tono'
s = s.replace(viejo, nuevo, 1)

viejo = """    for lab, val, sub, col in [('Aciertos', '67%', '204 de 303', tono(67)),"""
nuevo = """    for lab, val, sub, col in [('Aciertos', '67%', '204 de 303', tono_txt(67)),"""
assert viejo in s, 'no encontre los tiles'
s = s.replace(viejo, nuevo, 1)

viejo = """                 f'color: {tono(pct)}">{pct}%</span></div>')"""
nuevo = """                 f'color: {tono_txt(pct)}">{pct}%</span></div>')"""
assert viejo in s, 'no encontre el historial'
s = s.replace(viejo, nuevo, 1)

viejo = """                     f'text-align: right">{pct}%</span></div>')"""
nuevo = """                     f'text-align: right">{pct}%</span></div>')"""
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ------------------------------------------------------------------ build.py
p = 'build.py'
s = io.open(p, encoding='utf-8').read()
cambios = [
    ("f'transform: scaleX({esc:.2f}); box-shadow: 0 6px 18px rgba(0,0,0,.35); '",
     "f'transform: scaleX({esc:.2f}); box-shadow: {P[\"sombraCuadro\"]}; '"),
    ("contenido += (f'<span style=\"font-size: 13px; color: {P[\"verde\"]}; '",
     "contenido += (f'<span style=\"font-size: 13px; color: {P[\"verdeTxt\"]}; '"),
    ("f'background: rgba(8,10,9,{0.72 * op:.2f}); border-radius: 6px\">'",
     "f'background: rgba({P[\"scrimBase\"]},{0.72 * op:.2f}); border-radius: 6px\">'"),
]
for viejo, nuevo in cambios:
    assert viejo in s, f'no encontre: {viejo[:60]}'
    s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok paso 1')

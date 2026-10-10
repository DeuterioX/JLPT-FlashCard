# -*- coding: utf-8 -*-
"""Pantalla de repaso de significados: la misma hoja del quiz, sin escribir."""
import io

# ---------------------------------------------------------------- lib: boton shu
p = 'lib.py'
s = io.open(p, encoding='utf-8').read()
viejo = "    if tipo == 'peligro':"
nuevo = """    if tipo == 'shu':
        # El `.btn.danger` del diseno: shu en la PALABRA, sin fondo. Un bloque
        # shu lleno -el `peligro` de abajo- es para confirmar un borrado, no
        # para calificarse; aca "No la sabia" no destruye nada.
        return (f'<span style="{flex}height: {h}px; padding: 0 12px; display: inline-flex; '
                f'align-items: center; justify-content: center; border-radius: 7px; '
                f'background: {P["ink5"]}; border: 1px solid {P["ink4"]}; color: {P["shu"]}; '
                f'font-size: {fs}px; font-weight: 600; white-space: nowrap">{txt}</span>')
    if tipo == 'peligro':"""
assert viejo in s, 'no encontre boton peligro'
io.open(p, 'w', encoding='utf-8', newline='\n').write(s.replace(viejo, nuevo, 1))

# ---------------------------------------------------------------- gen: pantalla
GEN = '''# ============================================================ SIGNIFICADOS
def significados(w, h, revelado=False):
    """Repaso de significados: la misma hoja del quiz, sin escribir.

    El quiz pregunta CÓMO SE LEE una carta y se valida escribiendo el romaji.
    Esto pregunta QUÉ QUIERE DECIR, y eso no se puede teclear: «Estudiante»,
    «Empleado de empresa» y «Estados unidos» no son respuestas que una caja de
    texto pueda dar por buenas. Así que la carta se revela y te calificás vos,
    que es el trato de cualquier flashcard.

    La hoja NO se da vuelta. El giro de 翻 es para el quiz, donde el kana se va
    y entra la respuesta; acá querés ver la palabra AL LADO de su significado,
    porque eso es lo que estás tratando de unir. Además el dorso no daría: en
    teléfono la hoja de けんきゅうしゃ mide 336×48, y ahí no entran dos renglones.

    El hueco del significado está reservado también sin revelar, así la hoja no
    salta hacia arriba cuando aparece.

    Sólo corre sobre cartas con significado. Un kana no tiene: `card.meaning`
    es NULL en los mazos incluidos, y preguntar qué quiere decir あ no
    significa nada.
    """
    movil = w < 600
    lado = 280 if movil else 360
    disponible = (w - 48) if movil else (w - 160) * 0.78
    barH = 118 if movil else 80
    hueco = 48 if movil else 64

    hud = ''
    for i, (lab, val, col) in enumerate([('Sabidas', '2', P['ink0']), ('Restantes', '27', P['ink0']),
                                         ('No sabidas', '1', P['shu'])]):
        bl = f'border-left: 1px solid {P["ink4"]}; ' if i else ''
        hud += (f'<span style="{bl}padding: 6px 14px; display: flex; flex-direction: column; gap: 1px">'
                f'<span style="font-size: 9px; letter-spacing: .06em; text-transform: uppercase; '
                f'color: {P["ink3"]}">{lab}</span>'
                f'<span style="font-size: 14px; font-weight: 700; color: {col}">{val}</span></span>')
    hudbox = (f'<span style="display: flex; border: 1px solid {P["ink4"]}; border-radius: 8px; '
              f'overflow: hidden; flex: none">{hud}</span>')

    def tecla(t):
        return (f'<span style="font-family: {MONO}; font-size: 12px; padding: 2px 6px; '
                f'border-radius: 6px; border: 1px solid {P["ink4"]}; border-bottom-width: 2px; '
                f'color: {P["ink2"]}">{t}</span>')

    if revelado:
        # El centro es SIEMPRE lo que hay que hacer ahora, igual que el input
        # en el quiz; la derecha es siempre con qué tecla.
        centro = (f'<span style="display: flex; align-items: center; gap: 10px">'
                  f'{boton("No la sabía", "shu", h=36, fs=14, crecer=movil)}'
                  f'{boton("La sabía", "primario", h=36, fs=14, crecer=movil)}</span>')
        der = (f'<span style="display: flex; align-items: center; gap: 8px; font-size: 12px; '
               f'color: {P["ink3"]}">{tecla("N")}no{tecla("S")}sí</span>')
    else:
        centro = boton('Ver significado', 'primario', h=36, fs=14, crecer=movil)
        der = (f'<span style="display: flex; align-items: center; gap: 8px; font-size: 12px; '
               f'color: {P["ink3"]}">{tecla("Espacio")}revelar</span>')

    if movil:
        # En teléfono no hay teclado físico: la columna de teclas no va.
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; gap: 10px; '
                       f'width: 100%">{centro}</span>')
        caja = ('display: flex; flex-direction: column; align-items: center; justify-content: center; '
                'gap: 12px; padding: 12px')
    else:
        barra_inner = (f'<span style="justify-self: start">{hudbox}</span>{centro}'
                       f'<span style="justify-self: end">{der}</span>')
        caja = ('display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; '
                'gap: 16px; padding: 0 16px')

    barra = (f'<div style="position: absolute; left: 0; right: 0; bottom: 0; height: {barH}px; '
             f'background: {P["ink6"]}; border-top: 1px solid {P["ink5"]}; {caja}">{barra_inner}</div>')

    esc = (f'<span style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: {P["ink2"]}">'
           f'Minna no Nihongo I · Unidad 1'
           f'<span style="font-family: {MONO}; font-size: 12px; padding: 2px 6px; border-radius: 5px; '
           f'border: 1px solid {P["ink4"]}; border-bottom-width: 2px">Esc</span>salir</span>')
    top = (f'<div style="height: 48px; display: flex; align-items: center; justify-content: space-between; '
           f'padding: 0 16px; background: {P["ink6"]}; border-bottom: 1px solid {P["ink5"]}">'
           f'<span style="display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 15px">'
           f'<span style="font-size: 17px">🦊</span>Kitsune Cards</span>{esc}</div>')

    if revelado:
        respuesta = (f'<span style="font-family: {MONO}; font-size: {13 if movil else 15}px; '
                     f'color: {P["ink2"]}">kenkyuusha</span>'
                     f'<span style="font-size: {21 if movil else 30}px; color: {P["ink0"]}">Investigador</span>')
    else:
        respuesta = ''
    slot = (f'<div style="height: {hueco}px; display: flex; flex-direction: column; '
            f'align-items: center; justify-content: center; gap: 2px">{respuesta}</div>')

    stage = (f'<div style="position: absolute; left: 0; right: 0; top: 48px; bottom: {barH}px; '
             f'display: flex; flex-direction: column; align-items: center; justify-content: center; '
             f'gap: {12 if movil else 18}px">'
             f'{hoja_quiz("けんきゅうしゃ", lado, disponible, 44 if movil else 80)}{slot}'
             f'<span style="font-size: 11px; color: {P["ink3"]}">carta 4 de 30</span></div>')
    return marco(w, h, top + stage + barra)


# ============================================================ ESTADÍSTICAS'''

p = 'gen.py'
s = io.open(p, encoding='utf-8').read()
marca = '# ============================================================ ESTADÍSTICAS'
assert marca in s, 'no encontre la marca de estadisticas'
s = s.replace(marca, GEN, 1)

# La barra de Practica ofrece los dos modos.
viejo = """             f'<b style="color: {P["ink0"]}">4</b> grupos · <b style="color: {P["ink0"]}">20</b> cartas</span>'
             f'{boton("Comenzar →", "primario")}</div>')"""
nuevo = """             f'<b style="color: {P["ink0"]}">4</b> grupos · <b style="color: {P["ink0"]}">20</b> cartas</span>'
             f'<span style="display: flex; align-items: center; gap: 8px">{signif}'
             f'{boton("Escribir →", "primario")}</span></div>')"""
assert viejo in s, 'no encontre la barra de practica'
s = s.replace(viejo, nuevo, 1)

viejo = """    barra = (f'<div style="position: absolute; left: 0; right: 0; bottom: {56 if movil else 0}px; '"""
nuevo = """    # Los dos modos conviven en la barra: elegís los grupos y después con qué
    # los practicás. Acá está seleccionado Hiragana, y un kana no tiene
    # significado que repasar -`card.meaning` es NULL en los mazos incluidos-,
    # así que Significados va apagado.
    signif = (f'<span style="height: 36px; padding: 0 12px; display: inline-flex; align-items: center; '
              f'border-radius: 7px; background: {P["ink5"]}; border: 1px solid {P["ink4"]}; '
              f'color: {P["ink0"]}; font-size: 14px; font-weight: 600; white-space: nowrap; '
              f'opacity: .42">Significados →</span>')

    barra = (f'<div style="position: absolute; left: 0; right: 0; bottom: {56 if movil else 0}px; '"""
assert viejo in s, 'no encontre la barra'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok gen')

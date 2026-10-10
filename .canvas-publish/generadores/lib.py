# -*- coding: utf-8 -*-
"""Librería de componentes para las maquetas de Kitsune Cards.

Paleta y reglas: la dirección «tinta y papel». Las medidas salen de la app
corriendo, medidas con Playwright, no inventadas.
"""

# ---------------------------------------------------------------- tokens
# Dos temas con los MISMOS nombres de token. Todo el resto del código lee
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
    arrayTema='dark', papelOffNota='{d:.0f} puntos de L* debajo.',
)

PALETA_CLARA = dict(
    ink0='#1B211D', ink1='#39423B', ink2='#5C655D', ink3='#8A928A',
    ink4='#CBD0C9', ink5='#E6E9E3', ink6='#FBFCF9', ink7='#F1F3EE',
    ink8='#FDFEFC', ink9='#FFFFFF',
    # El papel apagado no se va sólo en claridad -en claro no hay lugar para
    # bajar 33 puntos de L* como en oscuro sin que quede más oscuro que la
    # página-: se va en TEMPERATURA. Deja de ser crema y pasa a ser un gris
    # neutro, que al lado de una hoja cálida se lee como apagado aunque la
    # diferencia de luz sea chica. La primera versión tenía los dos cremas a
    # 2 puntos y una tarjeta sin elegir no se distinguía de una elegida.
    papel='#E8E1CF', papelOff='#D2D1CB',
    papelInk='#6E6A62', papelInkDim='#908B81',
    sumi='#191713', sumiDim='#5F594E',
    # UN solo verde por tema. El verde medio de oscuro, usado igual acá,
    # recortaba el botón contra la página clara a 2,74:1 -por debajo del 3:1
    # que pide el borde de un control-, así que el relleno flotaba. Bajado a
    # este da 4,68:1 y la letra encima pasa a clara.
    #
    # Y de acá sale solo el color de la bolita del switch: la regla es «lo
    # que se apoya sobre verde va en verdeInk», así que en oscuro queda
    # oscura y en claro clara, sin una sola rama por tema.
    shu='#C4402E', verde='#2C7A54', verdeInk='#F2F7F4',
    verdeTxt='#2C7A54', ambar='#C8A23E', ambarTxt='#8A6A12',
    # El velo va en el gris-verde de la tinta y no en el sumi cálido: sumi al
    # 38% sobre una página clara le dejaba un tinte sepia a todo lo de atrás,
    # como una foto vieja. Y más liviano que en oscuro -34 contra 72%-, que
    # sobre claro alcanza de sobra para que el modal quede adelante.
    scrim='rgba(27,33,29,.34)', scrimBase='27,33,29',
    # Las sombras del tema oscuro son negro al 35 y al 50%: sobre una página
    # clara eso es una mancha. Acá son sumi a baja opacidad, que es lo que
    # hace una hoja apoyada sobre otra hoja.
    sombraHoja='0 8px 24px rgba(25,23,19,.14)',
    sombraCuadro='0 6px 18px rgba(25,23,19,.12)',
    sombraModal='0 18px 48px rgba(25,23,19,.18)',
    arrayTema='light',
    papelOffNota='Gris en vez de crema: se va en temperatura, no en luz '
                 '-son {d:.0f} puntos de L*-.',
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
    return nombre
UI = "'M PLUS 2', system-ui, sans-serif"
MINCHO = "'Zen Old Mincho', Georgia, serif"
KANA = "'Zen Kaku Gothic New', sans-serif"
MONO = "'M PLUS 1 Code', ui-monospace, monospace"

FONTS = ("https://fonts.googleapis.com/css2?family=M+PLUS+1+Code:wght@400;500"
         "&family=M+PLUS+2:wght@400;500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700"
         "&family=Zen+Old+Mincho:wght@400;700&display=swap")

# la pauta del 原稿用紙: shu al 16%
PAUTA = 'repeating-linear-gradient(to bottom, rgba(196,64,46,.16) 0 1px, transparent 1px {}px)'


def page(titulo, w, h, cuerpo, extra_css=''):
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{titulo}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="{FONTS}" rel="stylesheet">
<style>
/* El marco mide exactamente lo que dice su `$preview`, así que nada tiene
   por qué scrollear: si algo asoma, se recorta. Sin esto el contenedor del
   canvas le dibujaba barras a los marcos de teléfono. */
html, body {{ margin: 0; padding: 0; overflow: hidden; }}
body {{ font-family: {UI}; }}
* {{ box-sizing: border-box; }}
.f {{ width: {w}px; height: {h}px; background: {P['ink7']}; color: {P['ink0']};
     position: relative; overflow: hidden; font-family: {UI}; }}
{extra_css}
</style>
</helmet>
{cuerpo}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''


# ---------------------------------------------------------------- chrome
def topbar(activo='Práctica', ajustes=False):
    links = ''
    for t in ['Práctica', 'Mazos', 'Estadísticas']:
        on = t == activo
        bg = f'background: {P["ink5"]}; ' if on else ''
        col = P['ink0'] if on else P['ink2']
        links += (f'<span style="{bg}padding: 5px 12px; border-radius: 6px; font-size: 14px; '
                  f'color: {col}">{t}</span>')
    return (f'<div style="height: 48px; display: flex; align-items: center; gap: 32px; padding: 0 16px; '
            f'background: {P["ink6"]}; border-bottom: 1px solid {P["ink5"]}">'
            f'<span style="display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 15px">'
            f'<span style="width: 26px; height: 26px; border-radius: 4px; display: grid; place-items: center; '
            f'font-size: 17px; background: rgba(196,64,46,.12)">🦊</span>Kitsune Cards</span>'
            f'<span style="display: flex; gap: 4px">{links}</span>{_engranaje_barra(ajustes)}</div>')


def _engranaje_barra(activo=False):
    """El botón del engranaje de la barra de escritorio: el `default` de la
    app, 30px de alto como la píldora del menú. Apretado (en Ajustes y Acerca
    de) va con el relleno de la píldora activa."""
    bg = P['ink4'] if activo else P['ink5']
    return (f'<span style="margin-left: auto; width: 34px; height: 30px; border-radius: 7px; '
            f'background: {bg}; border: 1px solid {P["ink4"]}; display: grid; place-items: center">'
            f'{engranaje(15, P["ink0"])}</span>')


def navbar_movil(titulo, atras=True, accion=''):
    back = ''
    if atras:
        back = (f'<span style="align-self: stretch; flex: none; display: grid; place-items: center; '
                f'padding: 0 16px; margin-left: -16px; color: {P["ink0"]}">{chevron_izq(15)}</span>')
    return (f'<div style="height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 16px; '
            f'background: {P["ink6"]}; border-bottom: 1px solid {P["ink4"]}">{back}'
            f'<span style="font-size: 22px">🦊</span>'
            f'<span style="font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; '
            f'white-space: nowrap">{titulo}</span>'
            f'<span style="margin-left: auto; flex: none; align-self: stretch; display: flex; '
            f'align-items: center">{accion}</span></div>')


def accion_barra(glifo):
    """Una acción de la barra de teléfono -el engranaje, el lápiz-: sin marco y
    de punta a punta en vertical, con el blanco llegando al borde de la
    pantalla sin mover el glifo."""
    return (f'<span style="align-self: stretch; display: grid; place-items: center; '
            f'padding: 0 16px; margin-right: -16px">{glifo}</span>')


def chevron_izq(px=15):
    """El `ChevronLeft` de Bootstrap Icons, el de la flecha de volver de la app."""
    return (f'<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" '
            f'style="width: {px}px; height: {px}px; display: block">'
            f'<path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/></svg>')


def lapiz(px=15, color=None):
    """El `PencilFill` de Bootstrap Icons, el de «Renombrar» en teléfono."""
    c = color or P['ink0']
    return (f'<svg viewBox="0 0 16 16" fill="{c}" aria-hidden="true" '
            f'style="width: {px}px; height: {px}px; display: block">'
            f'<path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/></svg>')


def tabbar(activo='Mazos'):
    iconos = {'Práctica': '文', 'Mazos': '冊', 'Estadísticas': '計'}
    cel = ''
    for t in ['Práctica', 'Mazos', 'Estadísticas']:
        on = t == activo
        col = P['verdeTxt'] if on else P['ink2']
        cel += (f'<span style="flex: 1; display: flex; flex-direction: column; align-items: center; '
                f'gap: 1px; color: {col}">'
                f'<span style="font-family: {MINCHO}; font-size: 18px; line-height: 1.2">{iconos[t]}</span>'
                f'<span style="font-size: 11px; line-height: 1.3">{t}</span></span>')
    return (f'<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 56px; padding-top: 6px; '
            f'display: flex; background: {P["ink6"]}; border-top: 1px solid {P["ink4"]}">{cel}</div>')


def engranaje(px=14, color=None):
    """El `GearFill` de Bootstrap Icons, el mismo set que usa la app.

    `display: block` como la lupa: un SVG en línea le suma el descendente de la
    fuente a su caja y descentra la fila que lo contiene.
    """
    c = color or P['ink0']
    return (f'<svg viewBox="0 0 16 16" fill="{c}" aria-hidden="true" '
            f'style="width: {px}px; height: {px}px; display: block; flex: none">'
            f'<path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/></svg>')


def lupa(px=14, color=None):
    """La lupa de Bootstrap Icons, la misma que usa la app.

    La maqueta traía el emoji 🔍, que es un dibujo de otra familia -a color,
    con mango azul- y no el ícono de `react-bootstrap-icons` que `Icon.tsx`
    monta de verdad. Va como SVG inline y no como fuente de íconos por lo
    mismo que en la app: se le puede dar el tamaño en el sitio y hereda el
    color de al lado.

    `display: block` es obligatorio: un SVG inline suma el descendiente de la
    fuente a su caja de línea y descentra la fila que lo contiene -ya pasó en
    la tab bar-.
    """
    c = color or P['ink0']
    return (f'<svg viewBox="0 0 16 16" fill="{c}" aria-hidden="true" '
            f'style="width: {px}px; height: {px}px; display: block; flex: none">'
            f'<path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 '
            f'0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>'
            f'</svg>')


def boton(txt, tipo='default', h=36, fs=14, crecer=False, apagado=False):
    """`crecer` reparte el ancho del contenedor entre los botones de la fila.
    Los de hiragana/katakana lo necesitan: en la app miden 164,8px cada uno
    dentro de la columna de 336 del romaji, no el ancho de su texto."""
    flex = 'flex: 1 1 0; ' if crecer else ''
    # `apagado` va como opacidad y no como otro juego de colores: apaga el
    # botón entero -fondo, borde y palabra a la vez- así sigue siendo
    # reconocible como el mismo botón, sólo que fuera de alcance.
    if apagado:
        flex += 'opacity: .42; '
    if tipo == 'primario':
        return (f'<span style="{flex}height: {h}px; padding: 0 18px; display: inline-flex; '
                f'align-items: center; justify-content: center; border-radius: 7px; '
                f'background: {P["verde"]}; color: {P["verdeInk"]}; font-size: {fs}px; '
                f'font-weight: 600; white-space: nowrap">{txt}</span>')
    if tipo == 'peligro':
        return (f'<span style="{flex}height: {h}px; padding: 0 14px; display: inline-flex; '
                f'align-items: center; justify-content: center; border-radius: 7px; '
                f'background: {P["shu"]}; color: #F7F3EA; font-size: {fs}px; font-weight: 600; '
                f'white-space: nowrap">{txt}</span>')
    return (f'<span style="{flex}height: {h}px; padding: 0 12px; display: inline-flex; '
            f'align-items: center; justify-content: center; gap: 7px; border-radius: 7px; '
            f'background: {P["ink5"]}; border: 1px solid {P["ink4"]}; color: {P["ink0"]}; '
            f'font-size: {fs}px; font-weight: 600; white-space: nowrap">{txt}</span>')


def botones_juntos(items, h=36, fs=14, ancho_total=False):
    """Un botón partido en dos: dos acciones soldadas en un solo control.

    `items` es una lista de `(texto, tipo, apagado)`. Sueltas, dos acciones
    parecen dos cosas que no tienen nada que ver; juntas dicen que son la
    misma decisión con dos salidas -acá, arrancar la ronda de una manera o de
    la otra-.

    El radio vive en el contenedor y no en cada mitad -con `overflow: hidden`
    las esquinas de adentro salen rectas solas-, y la costura es un borde
    izquierdo en la segunda: contra el verde queda una línea oscura que separa
    sin agregar nada.
    """
    partes = ''
    for i, (txt, tipo, apagado) in enumerate(items):
        if tipo == 'primario':
            fondo, letra = P['verde'], P['verdeInk']
        else:
            fondo, letra = P['ink5'], P['ink0']
        costura = f'border-left: 1px solid {P["ink4"]}; ' if i else ''
        crece = 'flex: 1 1 0; ' if ancho_total else ''
        opac = 'opacity: .42; ' if apagado else ''
        partes += (f'<span style="{crece}{costura}{opac}height: {h}px; padding: 0 16px; '
                   f'display: inline-flex; align-items: center; justify-content: center; '
                   f'background: {fondo}; color: {letra}; font-size: {fs}px; font-weight: 600; '
                   f'white-space: nowrap">{txt}</span>')
    w = 'width: 100%; ' if ancho_total else ''
    return (f'<span style="{w}display: inline-flex; border-radius: 7px; overflow: hidden; '
            f'border: 1px solid {P["ink4"]}">{partes}</span>')


def campo(rotulo, valor, ancho=None, foco=False, crecer=False):
    """Un campo de texto SIEMPRE es papel: escribís sobre papel, con tinta.
    El foco no cambia el color -no hay azul en esta paleta-: engorda el filete
    sumi y suma el halo shu, que es la marca de corrección.

    El ancho es explícito y el `flex` nunca es `1` a secas: `flex: 1` incluye
    `flex-basis: 0`, y adentro de una columna eso aplica al ALTO -el campo de
    romaji, que va en columna con sus botones, colapsaba a menos de 36px-.
    `crecer` es el único caso que reparte ancho, y va con `flex-basis: 0`
    a propósito, en una fila."""
    if ancho:
        caja = f'width: {ancho}px; flex: 0 0 auto; '
    elif crecer:
        caja = 'flex: 1 1 0; min-width: 0; '
    else:
        caja = 'width: 100%; flex: 0 0 auto; '
    if foco:
        borde = f'border: 1.5px solid {P["sumi"]}; box-shadow: 0 0 0 3px rgba(196,64,46,.22); '
    else:
        borde = 'border: 1px solid rgba(25,23,19,.28); '
    return (f'<span style="{caja}height: 36px; box-sizing: border-box; display: flex; '
            f'align-items: center; gap: 10px; padding: 0 12px; border-radius: 7px; '
            f'background: {P["papel"]}; {borde}">'
            f'<span style="font-size: 9px; letter-spacing: .06em; text-transform: uppercase; '
            f'color: {P["sumiDim"]}; flex: none">{rotulo}</span>'
            f'<span style="font-size: 16px; color: {P["sumiDim"]}; overflow: hidden; '
            f'text-overflow: ellipsis; white-space: nowrap">{valor}</span></span>')


def seclab(jp, ro, acc=''):
    """Encabezado de sección: nombre japonés en Mincho, romaji, filete, y lo que
    la pantalla cuelgue al final. El accesorio va DESPUÉS de la línea -como en
    la app- y no al lado del rótulo: si no, la línea se colapsa y queda sólo su
    marca shu de 18px pegada al botón."""
    return (f'<div style="display: flex; align-items: center; gap: 10px">'
            f'<span style="font-family: {MINCHO}; font-size: 19px; line-height: 1; color: {P["ink0"]}">{jp}</span>'
            f'<span style="font-size: 11px; color: {P["ink3"]}">{ro}</span>'
            f'<span style="flex: 1; min-width: 20px; height: 1px; background: {P["ink5"]}; position: relative">'
            f'<span style="position: absolute; left: 0; top: 0; width: 18px; height: 1px; '
            f'background: {P["shu"]}"></span></span>{acc}</div>')


def switch(on):
    pos = 'right: 2px' if on else 'left: 2px'
    bg = P['verde'] if on else P['ink5']
    thumb = P['verdeInk'] if on else P['ink2']
    return (f'<span style="position: relative; width: 32px; height: 16px; border-radius: 100px; '
            f'background: {bg}; flex: none; display: block">'
            f'<span style="position: absolute; top: 2px; {pos}; width: 12px; height: 12px; '
            f'border-radius: 50%; background: {thumb}"></span></span>')


def filos_swipe(izq=True, der=True):
    """Los dos filetes de 3px que anuncian el swipe de una fila en teléfono.

    La regla, igual en las tres listas: el borde DERECHO lleva shu y descubre
    Borrar; el IZQUIERDO lleva verde y descubre la acción no destructiva de esa
    fila -Mover una carta, Renombrar un grupo, Practicar un mazo-. O sea que el
    color no dice QUÉ acción es -eso lo dice la palabra del panel cuando se
    abre-, dice si te podés arrepentir. Es la convención de iOS y es la única
    que sobrevive a que cada lista tenga verbos distintos.

    Cada filete existe sólo si esa acción está disponible en esa fila, así el
    borde nunca promete algo que el gesto no va a cumplir.

    Va de borde a borde de la fila, sin retiro y sin radio. Probé retirarlo 8px
    arriba y abajo para que se leyera como un tilde por fila en vez de una
    línea corrida, y sale peor: el filete queda de 3x39px apoyado ENCIMA del
    borde de 1px de la lista, el borde asoma en el hueco entre un filete y el
    siguiente, y el marco entero termina pareciendo un borde punteado rojo. A
    tope el filete tapa el borde en todo su tramo y la caja sigue siendo una
    caja.

    Que en una lista donde todas las filas tienen la misma acción quede una
    línea corrida no es un problema: es verdad. Lo que tiene que distinguirse
    es la fila que NO la tiene, y ahí el tramo sin pintar se ve igual -en
    Mazos, con un solo mazo propio, el shu es un tramo corto y evidente-.

    Devuelve spans absolutos: la fila que los reciba tiene que ser
    `position: relative`.
    """
    s = ''
    if izq:
        s += (f'<span style="position: absolute; left: 0; top: 0; bottom: 0; width: 3px; '
              f'background: {P["verde"]}"></span>')
    if der:
        s += (f'<span style="position: absolute; right: 0; top: 0; bottom: 0; width: 3px; '
              f'background: {P["shu"]}"></span>')
    return s


def fila_carta(kana, rom, sig, primera=False, mover=True, borrar=True):
    """La fila de carta en teléfono, con un filete en cada borde del color de la
    acción que ese gesto descubre: verde a la izquierda para mover, shu a la
    derecha para borrar.

    Hoy las acciones de swipe son invisibles hasta que hacés el gesto: no hay
    nada que diga que están ahí ni para qué lado va cada una. El filete lo dice
    sin ocupar ancho, y se apaga cuando la acción no está disponible -mover
    necesita que el mazo tenga más de un grupo; un mazo de fábrica no permite
    ninguna de las dos-, así que el borde no promete algo que el gesto no va a
    cumplir.
    """
    borde = '' if primera else f'border-top: 1px solid {P["ink5"]}; '
    filos = filos_swipe(mover, borrar)
    return (f'<div style="{borde}position: relative; padding: 10px 16px; display: flex; '
            f'flex-wrap: wrap; column-gap: 12px; row-gap: 2px">{filos}'
            f'<span style="font-family: {KANA}; font-size: 16px; line-height: 1.55">{kana}</span>'
            f'<span style="font-family: {MONO}; font-size: 14px; color: {P["ink2"]}; '
            f'align-self: center">{rom}</span>'
            f'<span style="width: 100%; font-size: 14px; color: {P["ink2"]}">{sig}</span></div>')


def tarjeta_grupo(nombre, filas, on, alto=242, kana_px=19, paso=38.4, mas=0):
    """Tarjeta de grupo: franja de tinta arriba, hoja de papel abajo.

    El pie dice SIEMPRE el total del grupo -las `filas` que se ven más las
    `mas` que quedan afuera-, como en la app. Antes era «N palabras más» y sólo
    en los grupos que no entraban enteros. El nombre va a 12px (`xs`) y el pie
    a 9px; apagados, los dos en `ink3`.
    """
    total = len(filas) + mas
    papel = P['papel'] if on else P['papelOff']
    tinta = P['sumi'] if on else P['papelInk']
    tintaR = P['sumiDim'] if on else P['papelInkDim']
    renglones = ''
    for k, r in filas:
        renglones += (f'<span style="height: {paso}px; display: flex; flex-direction: column; '
                      f'align-items: center; justify-content: center">'
                      f'<span style="font-family: {KANA}; font-weight: 500; font-size: {kana_px}px; '
                      f'line-height: 1.05; color: {tinta}; max-width: 100%; overflow: hidden; '
                      f'text-overflow: ellipsis; white-space: nowrap">{k}</span>'
                      f'<span style="font-size: 9.5px; line-height: 1.5; color: {tintaR}; letter-spacing: .03em; '
                      f'max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{r}</span>'
                      f'</span>')
    return (f'<div style="height: {alto}px; background: {P["ink6"]}; border: 1px solid {P["ink5"]}; '
            f'border-radius: 6px; padding: 6px; display: flex; flex-direction: column; gap: 6px">'
            f'<span style="display: flex; align-items: center; justify-content: space-between; padding: 0 2px">'
            f'<span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; '
            f'font-size: 12px; font-weight: 500; color: {P["ink0"] if on else P["ink3"]}">{nombre}</span>'
            f'{switch(on)}</span>'
            f'<span style="flex: 1; border-radius: 3px; background: {papel}; display: flex; '
            f'flex-direction: column; justify-content: center; overflow: hidden; '
            f'background-image: {PAUTA.format(paso)}">{renglones}</span>'
            + f'<span style="text-align: center; font-size: 9px; line-height: 1.4; '
              f'color: {P["ink1"] if on else P["ink3"]}">'
              f'{total} palabra{"s" if total != 1 else ""}</span>'
            + '</div>')


def celda_genko(ch, lado, primera_col, primera_fila, fuente):
    """Una celda del papel de manuscrito, con su cruz de guía.

    Los cuatro bordes SIEMPRE, y las celdas que no arrancan fila o columna se
    corren 1px con margen negativo para que su borde caiga encima del de la
    vecina. Antes el borde repetido se sacaba con `border-left: none` /
    `border-top: none`, y eso rompía la cruz: con `box-sizing: border-box` la
    caja de relleno mide `lado` menos los bordes que le QUEDEN, así que a una
    celda sin borde izquierdo le mide `lado-1` de ancho y `lado-2` de alto. La
    cruz va en `left/top: 50%` de esa caja, o sea que un eje caía en medio
    píxel -difuso, repartido entre dos- y el otro en entero -nítido-, y una de
    las dos líneas se veía siempre más gruesa que la otra. Medido: con lado 98
    daba 48,5 contra 48.

    Con los cuatro bordes la caja es `lado-2` en los dos ejes, y como `lado` es
    par (ver `hoja_quiz`), la mitad es entera en los dos. El solapado dibuja
    una sola línea de 1px entre celdas, igual que antes.
    """
    m = ''
    if not primera_col:
        m += 'margin-left: -1px; '
    if not primera_fila:
        m += 'margin-top: -1px; '
    glifo = '' if ch == ' ' else (
        f'<span style="font-family: {MINCHO}; font-size: {fuente:.1f}px; line-height: 1; '
        f'color: {P["sumi"]}; position: relative">{ch}</span>')
    # La cruz va en UN SVG y no en dos divs de 1px. Un borde o un fondo de
    # 1px lo ENCAJA el compositor en píxeles enteros del dispositivo: al 410%
    # de zoom del visor, todas las verticales comparten una fase y todas las
    # horizontales otra, así que un eje redondea a 4px y el otro a 5 y un eje
    # entero se ve más grueso que el otro. Un trazo de SVG no se encaja, se
    # antialiasea, así que los dos ejes salen del mismo ancho a cualquier
    # zoom. `preserveAspectRatio="none"` es seguro porque la celda es
    # cuadrada: los dos trazos escalan por el mismo factor.
    #
    # El grosor va en unidades del viewBox: 100 unidades son `lado` píxeles,
    # así que 1px son 100/lado.
    gr = 100 / lado
    cruz = (f'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" '
            f'shape-rendering="geometricPrecision" '
            f'style="position: absolute; inset: 0; width: 100%; height: 100%">'
            f'<line x1="50" y1="8" x2="50" y2="92" stroke="rgba(160,66,50,.20)" '
            f'stroke-width="{gr:.4f}"/>'
            f'<line x1="8" y1="50" x2="92" y2="50" stroke="rgba(160,66,50,.20)" '
            f'stroke-width="{gr:.4f}"/></svg>')
    return (f'<span style="width: {lado}px; height: {lado}px; position: relative; '
            f'display: grid; place-items: center; border: 1px solid rgba(25,23,19,.16); '
            f'{m}flex: none">{cruz}{glifo}</span>')


def progreso(pct, abajo):
    """La barra de progreso de la ronda, entre el escenario y el pie.

    En la app es un `<Progress size="xs" radius={0}>` pegado al borde de
    arriba del pie y de punta a punta -sin radio y sin margen-, así que no es
    un elemento del escenario sino la costura entre el escenario y la barra
    de abajo. La maqueta no la tenía.
    """
    return (f'<div style="position: absolute; left: 0; right: 0; bottom: {abajo}px; height: 3px; '
            f'background: {P["ink5"]}">'
            f'<div style="width: {pct}%; height: 3px; background: {P["verde"]}"></div></div>')


def carta_n_de_m(txt):
    """«carta N de M», anclada al PISO del escenario, no debajo de la hoja.

    Es `.knd-quiz-caption` de la app: `position: absolute; bottom: 1rem`,
    centrada sobre todo el ancho. Queda pegada a la barra de progreso, que
    viene justo después. En la maqueta estaba adentro de la columna centrada,
    o sea colgando de la hoja, y se movía con ella -que es justo lo que el
    comentario de `QuizRunner.tsx` dice que NO hay que hacer-.
    """
    return (f'<span style="position: absolute; left: 0; right: 0; bottom: 16px; text-align: center; '
            f'font-size: 11px; color: {P["ink3"]}">{txt}</span>')


def hoja_quiz(texto, lado_max, disponible, lado_min=80):
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
    # Entero PAR, no el float que sale de la división. Con un lado
    # fraccionario -99,8px medidos- cada borde de la cuadrícula cae en una
    # fase de subpíxel distinta (221,016 · 320,813 · 420,61 …), y el navegador
    # redondea cada línea para su lado: unas quedan de un píxel y otras de
    # dos, que al zoom del lienzo se ven de uno contra tres. Con un lado
    # entero todas las líneas comparten la misma fase y se dibujan iguales.
    # Par además de entero porque la cruz de guía va en `left/top: 50%`: con
    # un lado impar ese 50% cae en medio píxel y la guía sale difusa.
    lado = int(min(lado_max, disponible / ancho_fila)) // 2 * 2
    fuente = lado * 0.62

    filas = []
    for f in range(n_filas):
        tramo = chars[f * ancho_fila:(f + 1) * ancho_fila]
        # La última fila se completa con celdas vacías: en el papel impreso
        # están TODAS dibujadas, se llenen o no, y sin esto el bloque de papel
        # quedaba con un pedazo sin cuadricular.
        tramo = tramo + [' '] * (ancho_fila - len(tramo))
        celdas = ''
        for k, ch in enumerate(tramo):
            celdas += celda_genko(ch, lado, k == 0, f == 0, fuente)
        filas.append(f'<div style="display: flex">{celdas}</div>')

    # Con los bordes solapados la hoja mide `n * lado - (n - 1)`, que puede
    # dar IMPAR. Y una hoja de ancho impar centrada en un marco de ancho par
    # arranca en medio píxel, con lo cual toda la cuadrícula queda difusa -no
    # una línea más que otra, pero difusa-. Un píxel de margen del lado que
    # haga falta vuelve la caja externa a par y la hoja vuelve a arrancar en
    # entero. Va como margen y no como relleno para no agregarle papel
    # visible al borde.
    ancho = ancho_fila * lado - (ancho_fila - 1)
    altura = n_filas * lado - (n_filas - 1)
    impar = ''
    if ancho % 2:
        impar += 'margin-right: 1px; '
    if altura % 2:
        impar += 'margin-bottom: 1px; '
    return (f'<div style="display: flex; flex-direction: column; align-items: flex-start; '
            f'background: {P["papel"]}; border-radius: 3px; {impar}'
            f'box-shadow: {P["sombraHoja"]}; overflow: hidden">{"".join(filas)}</div>')


def _titulo_modal(t, destructivo=False):
    """El kanji en Mincho y el castellano en la tipografía de interfaz, que es
    el mismo criterio de los encabezados de sección (`基本 gojūon`). Poner el
    título entero en Mincho hacía que los modales parecieran de otra familia.

    El kanji va en shu -es el único calor del encabezado- y el TEXTO siempre en
    tinta, también en el modal de borrar. Ahí lo probé en shu para que se
    distinguiera y estaba mal por dos motivos: el modal ya se distingue por su
    botón rojo, que es donde está la acción, y gritar en dos lugares le quita
    peso al botón. Además se leía peor: medido, el título en shu da 3,21:1
    contra el fondo del modal y en tinta 13,75:1.
    """
    if ' · ' in t:
        jp, resto = t.split(' · ', 1)
        return (f'<span style="display: flex; align-items: baseline; gap: 9px">'
                f'<span style="font-family: {MINCHO}; font-size: 18px; line-height: 1; '
                f'color: {P["shu"]}">{jp}</span>'
                f'<span style="font-size: 14px; font-weight: 700; color: {P["ink0"]}">{resto}</span></span>')
    return f'<span style="font-size: 14px; font-weight: 700; color: {P["ink0"]}">{t}</span>'


def modal(titulo, cuerpo, ancho=420, marco=1440, destructivo=False):
    """Un modal centrado sobre el velo.

    El ancho se calcula contra el marco en vez de confiar en `max-width: 100%`:
    ese porcentaje no resuelve igual dentro del canvas, y un modal de 460 se
    salía de un teléfono de 390 arrastrando barras de scroll."""
    ancho = min(ancho, marco - 40)
    return (f'<div style="position: absolute; inset: 0; background: {P["scrim"]}; '
            f'display: grid; place-items: center; padding: 20px">'
            f'<div style="width: {ancho}px; background: {P["ink6"]}; '
            f'border: 1px solid {P["ink4"]}; border-radius: 10px; overflow: hidden; '
            f'box-shadow: {P["sombraModal"]}">'
            f'<div style="padding: 14px 16px; border-bottom: 1px solid {P["ink5"]}; display: flex; '
            f'align-items: center; justify-content: space-between; gap: 10px">'
            f'{_titulo_modal(titulo, destructivo)}'
            f'<span style="color: {P["ink3"]}; font-size: 15px; flex: none">✕</span></div>'
            f'<div style="padding: 16px">{cuerpo}</div></div></div>')

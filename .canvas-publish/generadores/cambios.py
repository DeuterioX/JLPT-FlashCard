# -*- coding: utf-8 -*-
"""Registro de cambios: lo que cambió en la app entre el 5 y el 7 de octubre
de 2026, por pantalla, en el mismo lenguaje del resto del canvas."""
import io, json
from lib import P, tema, MONO, seclab
from gen import emitir

SECCIONES = [
    ('文', 'Práctica', [
        'Los dos botones de la ronda dicen «Repasar significados» y «Repasar escritura», sin flechas.',
        '«todos · ninguno», dos verbos de texto a la derecha del selector de mazos. En teléfono no está.',
        'El nombre del grupo va en una línea, con elipsis si no entra, y un tooltip con el nombre completo '
        'al pasar el mouse. Así todas las hojas de una fila arrancan a la misma altura.',
    ]),
    ('翻', 'Rondas', [
        'Título de la ronda: «Repasar escritura» o «Repasar significados». En teléfono es la barra de '
        'navegación, con la flecha de volver a Práctica y el mazo a la derecha.',
        'En teléfono no hay botón Revelar: se toca la carta.',
        'Significados revela con el mismo giro que Escribir: atrás de la hoja, la lectura y el significado.',
        'El giro: 380 ms, sobre el eje X, sin perspectiva y con la carta siempre en su capa. Ya no salta un '
        'píxel de costado con el escalado al 125%.',
        'Al calificar una carta revelada, la siguiente entra de frente: antes la vuelta mostraba su respuesta.',
        'La carta ya no se agranda un instante al pasar de palabra.',
        'Mantener apretada una tecla no repite la acción.',
        'El resumen de la ronda se estira para que entren las palabras, y si no entran, elipsis.',
    ]),
    ('設', 'Ajustes y Acerca de', [
        'Pantallas nuevas, como en el canvas. Se entra por el engranaje, que reemplazó al botón de tema.',
        'Tema: segmento en escritorio; en teléfono una fila que abre un modal con Cancelar y Guardar.',
        'Idioma: la fila está, apagada, con español elegido y 日本語 e inglés en «pronto».',
        'Acerca de: el zorro, キツネ en la hoja, el texto del proyecto, la versión y los créditos, con '
        'JMdict enlazado como pide su licencia.',
        'Las opciones de los modales son las de «Mover palabra»: un solo control para elegir de una lista.',
    ]),
    ('冊', 'Mazos', [
        'Minna no Nihongo I viene con la app: 8 lecciones como secciones, 62 grupos y 598 cartas, '
        'cargados desde el markdown de vocabulario.',
        'Nombres de grupo de una o dos palabras, y ningún grupo de menos de cuatro cartas.',
        'Para volver a cargarlo: npm run db:import:minna -- archivo.md. Reemplaza el mazo entero.',
    ]),
    ('道', 'Barras', [
        'En escritorio, el engranaje al ras de la derecha en todas las pantallas.',
        'En teléfono, la flecha de volver, el lápiz de renombrar y el engranaje van sin marco y de alto '
        'completo: el blanco para el pulgar es la barra entera.',
    ]),
    ('未', 'Pendiente', [
        'Grupos y Cartas siguen dibujando Minna no Nihongo como un mazo propio editable, con los grupos '
        'viejos. Ahora es un mazo incluido y no se edita: hace falta decidir con qué mazo se muestran.',
        'En teléfono, en Significados, el nombre del mazo a la derecha corta el título de la ronda.',
        'Cookie de dueño y login: diseñados en docs/owner-and-login.md, sin implementar.',
    ]),
]


def lista(items):
    lis = ''.join(
        f'<li style="display: flex; gap: 10px; align-items: baseline">'
        f'<span style="flex: none; width: 5px; height: 5px; border-radius: 50%; background: {P["shu"]}; '
        f'transform: translateY(-2px)"></span>'
        f'<span style="flex: 1; min-width: 0">{t}</span></li>' for t in items)
    return (f'<ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; '
            f'gap: 8px; font-size: 13px; line-height: 1.55; color: {P["ink1"]}; text-wrap: pretty">{lis}</ul>')


def lamina(w, h):
    cab = (f'<div style="display: flex; flex-direction: column; gap: 6px">'
           f'<span style="font-size: 22px; font-weight: 700; color: {P["ink0"]}">Registro de cambios</span>'
           f'<span style="font-family: {MONO}; font-size: 11px; color: {P["ink3"]}">'
           f'5 al 7 de octubre de 2026 · rama feat/ui-design-fidelity</span></div>')
    col = lambda secs: (f'<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 26px">'
                        + ''.join(f'<div style="display: flex; flex-direction: column; gap: 12px">'
                                  f'{seclab(jp, nombre)}{lista(items)}</div>' for jp, nombre, items in secs)
                        + '</div>')
    cuerpo = (f'<div style="padding: 36px 40px; display: flex; flex-direction: column; gap: 28px">{cab}'
              f'<div style="display: flex; gap: 48px; align-items: flex-start">'
              f'{col(SECCIONES[:2])}{col(SECCIONES[2:])}</div></div>')
    return f'<div class="f" style="width: {w}px; height: {h}px">{cuerpo}</div>'


W, H, Y = 1240, 920, 13600
nuevos = {}
for nombre, tit, t, x in [('Cambios', 'Registro de cambios', 'oscuro', 0),
                          ('ClCambios', 'Registro de cambios · claro', 'claro', W + 30)]:
    tema(t)
    emitir(f'{nombre}.dc.html', tit, W, H, lamina(W, H), x, Y)
    nuevos[f'{nombre}.dc.html'] = {'x': x, 'y': Y, 'w': W, 'h': H, 'title': tit}
tema('oscuro')
json.dump(nuevos, io.open('nuevos6.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(nuevos))

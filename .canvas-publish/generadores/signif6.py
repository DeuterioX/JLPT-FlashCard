# -*- coding: utf-8 -*-
"""Revelar vuelve a estar SIEMPRE, como interruptor, y convive con si/no."""
import io

p = 'gen.py'
s = io.open(p, encoding='utf-8').read()

viejo = """    # La acción va donde la pone el quiz: TECLA + BOTÓN, a la derecha de la
    # barra, con las medidas del quiz (h=30, fs=13). La primera versión tenía
    # el botón en el centro -donde el quiz tiene el input- y la tecla suelta
    # con la palabra «revelar» en texto apagado, y al lado del quiz se veía
    # como otra pantalla. El centro queda vacío porque acá no hay nada que
    # escribir, que es justamente de lo que se trata el modo.
    # «No la sabía» lleva el mismo botón que «Borrar el grupo» en los modales:
    # `peligro`, shu lleno. Es el par del verde de «La sabía», y las dos
    # respuestas pesan lo mismo en la barra.
    if revelado:
        der = (f'{tecla("N")}{boton("No la sabía", "peligro", h=30, fs=13)}'
               f'{tecla("S")}{boton("La sabía", "primario", h=30, fs=13)}')
    else:
        # `default`, no `primario`: en el quiz este mismo botón es el default
        # -medido, ink5-. El verde de la barra queda para «La sabía», que es
        # una respuesta, no un paso.
        der = f'{tecla("Espacio")}{boton("Revelar", h=30, fs=13)}'

    if movil:
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; gap: 8px; '
                       f'justify-content: center; width: 100%">{der}</span>')
        caja = ('display: flex; flex-direction: column; align-items: center; justify-content: center; '
                'gap: 12px; padding: 12px')
    else:
        barra_inner = (f'<span style="justify-self: start">{hudbox}</span><span></span>'
                       f'<span style="justify-self: end; display: flex; align-items: center; '
                       f'gap: 8px">{der}</span>')
        caja = ('display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; '
                'gap: 16px; padding: 0 16px')"""
nuevo = """    # Revelar está SIEMPRE, y es un interruptor: muestra y esconde el
    # significado. No es un paso que se consume -eso era lo que estaba mal-,
    # porque en un repaso querés poder tapar la respuesta y volver a mirarla
    # sin salir de la carta. Va en la misma ranura que en el quiz, TECLA +
    # BOTÓN a la derecha, con las medidas del quiz (h=30, fs=13) y el mismo
    # botón `default`: el verde queda para «La sabía», que es una respuesta y
    # no un paso.
    #
    # Y aparte, siempre presentes, los dos de calificarse. Están desde el
    # principio a propósito: si te acordabas, calificás sin revelar nada.
    # «No la sabía» lleva el mismo botón que «Borrar el grupo» en los modales
    # -`peligro`, shu lleno-, que es el par exacto del verde de al lado.
    calif = [boton('No la sabía', 'peligro', h=30, fs=13),
             boton('La sabía', 'primario', h=30, fs=13)]
    rotulo = 'Ocultar' if revelado else 'Revelar'
    der = f'{tecla("Espacio")}{boton(rotulo, h=30, fs=13)}'

    if movil:
        # Misma fila que el quiz en teléfono: lo de la izquierda -allá el
        # input, acá las dos respuestas- y a la derecha la tecla con su botón.
        # Las teclas N y S no van: no hay teclado, y son 120px que no sobran.
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; gap: 8px; '
                       f'width: 100%; justify-content: space-between">'
                       f'<span style="display: flex; align-items: center; gap: 8px">'
                       f'{"".join(calif)}</span>'
                       f'<span style="display: flex; align-items: center; gap: 8px">{der}</span></span>')
        caja = ('display: flex; flex-direction: column; align-items: center; justify-content: center; '
                'gap: 12px; padding: 12px')
    else:
        centro = (f'<span style="display: flex; align-items: center; gap: 8px">'
                  f'{tecla("N")}{calif[0]}{tecla("S")}{calif[1]}</span>')
        barra_inner = (f'<span style="justify-self: start">{hudbox}</span>{centro}'
                       f'<span style="justify-self: end; display: flex; align-items: center; '
                       f'gap: 8px">{der}</span>')
        caja = ('display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; '
                'gap: 16px; padding: 0 16px')"""
assert viejo in s, 'no encontre la barra'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')

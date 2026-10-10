# -*- coding: utf-8 -*-
"""Barra de progreso, el rotulo 'carta N de M' donde lo pone la app, y sin
teclas en el Significados de telefono."""
import io

# ------------------------------------------------------------------ gen
p = 'gen.py'
s = io.open(p, encoding='utf-8').read()
s = s.replace('tabbar, fila_carta, filos_swipe, botones_juntos, lupa,',
              'tabbar, fila_carta, filos_swipe, botones_juntos, lupa, progreso, carta_n_de_m,', 1)

# --- quiz: una ronda empezada, para que la barra tenga algo que mostrar
viejo = """    hud = ''
    for i, (lab, val, mal) in enumerate([('Aciertos', '100%', False), ('Restantes', '5', False),
                                         ('Errores', '0', True)]):"""
nuevo = """    # Ronda EMPEZADA y no recién abierta: con «carta 1 de 5» la barra de
    # progreso queda en 0% y no se ve, que es justo lo que había que mostrar.
    # 5 cartas, 2 contestadas, la 3ª al frente: restantes cuenta la actual.
    hud = ''
    for i, (lab, val, mal) in enumerate([('Aciertos', '100%', False), ('Restantes', '3', False),
                                         ('Errores', '0', True)]):"""
assert viejo in s, 'no encontre el hud del quiz'
s = s.replace(viejo, nuevo, 1)

viejo = """    stage = (f'<div style="position: absolute; left: 0; right: 0; top: 48px; bottom: {barH}px; '
             f'display: flex; flex-direction: column; align-items: center; justify-content: center; '
             f'gap: {18 if movil else 26}px">{hoja_quiz(kana, lado, disponible, 44 if movil else 80)}'
             f'<span style="font-size: 11px; color: {P["ink3"]}">carta 1 de 5</span></div>')
    return marco(w, h, top + stage + barra)"""
nuevo = """    stage = (f'<div style="position: absolute; left: 0; right: 0; top: 48px; bottom: {barH}px; '
             f'display: flex; flex-direction: column; align-items: center; justify-content: center; '
             f'gap: {18 if movil else 26}px">{hoja_quiz(kana, lado, disponible, 44 if movil else 80)}'
             f'{carta_n_de_m("carta 3 de 5")}</div>')
    return marco(w, h, top + stage + progreso(40, barH) + barra)"""
assert viejo in s, 'no encontre el stage del quiz'
s = s.replace(viejo, nuevo, 1)

# --- significados: mismo tratamiento
viejo = """    stage = (f'<div style="position: absolute; left: 0; right: 0; top: 48px; bottom: {barH}px; '
             f'display: flex; flex-direction: column; align-items: center; justify-content: center; '
             f'gap: {12 if movil else 18}px">'
             f'{hoja_quiz("けんきゅうしゃ", lado, disponible, 44 if movil else 80)}{slot}'
             f'<span style="font-size: 11px; color: {P["ink3"]}">carta 4 de 30</span></div>')
    return marco(w, h, top + stage + barra)"""
nuevo = """    stage = (f'<div style="position: absolute; left: 0; right: 0; top: 48px; bottom: {barH}px; '
             f'display: flex; flex-direction: column; align-items: center; justify-content: center; '
             f'gap: {12 if movil else 18}px">'
             f'{hoja_quiz("けんきゅうしゃ", lado, disponible, 44 if movil else 80)}{slot}'
             f'{carta_n_de_m("carta 4 de 30")}</div>')
    # 3 contestadas de 30: 2 sabidas y 1 no sabida, la 4ª al frente.
    return marco(w, h, top + stage + progreso(10, barH) + barra)"""
assert viejo in s, 'no encontre el stage de significados'
s = s.replace(viejo, nuevo, 1)

# --- telefono: sin teclas
viejo = """    if movil:
        # Misma fila que el quiz en teléfono: lo de la izquierda -allá el
        # input, acá las dos respuestas- y a la derecha la tecla con su botón.
        # Las teclas N y S no van: no hay teclado, y son 120px que no sobran.
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; gap: 8px; '
                       f'width: 100%; justify-content: space-between">'
                       f'<span style="display: flex; align-items: center; gap: 8px">'
                       f'{"".join(calif)}</span>'
                       f'<span style="display: flex; align-items: center; gap: 8px">{der}</span></span>')"""
nuevo = """    if movil:
        # Sin teclas. Acá no hay ningún campo que abra el teclado -de eso se
        # trata el modo-, así que anunciar «Espacio» y «Esc» es prometer algo
        # que en un teléfono no existe. Los tres botones a ancho completo.
        der = boton(rotulo, h=30, fs=13, crecer=True)
        juntos = [boton('No la sabía', 'peligro', h=30, fs=13, crecer=True),
                  boton('La sabía', 'primario', h=30, fs=13, crecer=True), der]
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; gap: 8px; '
                       f'width: 100%">{"".join(juntos)}</span>')"""
assert viejo in s, 'no encontre la barra movil de significados'
s = s.replace(viejo, nuevo, 1)

viejo = """    contexto = 'Unidad 1' if movil else 'Minna no Nihongo I · Unidad 1'
    esc = (f'<span style="display: flex; align-items: center; gap: 10px; font-size: 13px; '
           f'color: {P["ink2"]}; white-space: nowrap">{contexto}'
           f'<span style="font-family: {MONO}; font-size: 12px; padding: 2px 6px; border-radius: 5px; '
           f'border: 1px solid {P["ink4"]}; border-bottom-width: 2px">Esc</span>salir</span>')"""
nuevo = """    contexto = 'Unidad 1' if movil else 'Minna no Nihongo I · Unidad 1'
    if movil:
        # «Esc» tampoco: sin teclado físico es una tecla que no se puede
        # apretar. Queda «Salir» como botón, que es la acción de verdad.
        esc = (f'<span style="display: flex; align-items: center; gap: 10px; font-size: 13px; '
               f'color: {P["ink2"]}; white-space: nowrap">{contexto}'
               f'{boton("Salir", h=26, fs=12)}</span>')
    else:
        esc = (f'<span style="display: flex; align-items: center; gap: 10px; font-size: 13px; '
               f'color: {P["ink2"]}; white-space: nowrap">{contexto}'
               f'<span style="font-family: {MONO}; font-size: 12px; padding: 2px 6px; border-radius: 5px; '
               f'border: 1px solid {P["ink4"]}; border-bottom-width: 2px">Esc</span>salir</span>')"""
assert viejo in s, 'no encontre el contexto'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok progreso + rotulo + telefono')

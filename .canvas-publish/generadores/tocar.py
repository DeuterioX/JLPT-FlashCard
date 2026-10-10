# -*- coding: utf-8 -*-
"""En teléfono revelar es TOCAR la carta: el botón se va de la barra.

Los dos tableros de teléfono -quiz y significados- dejaban un botón «Revelar»
en la barra de abajo. En una pantalla chica eso cuesta doble: le come el ancho
al input -que es lo único que ahí hace falta- y pone a competir tres controles
en una fila de 390px. Dar vuelta una carta tocándola es además lo que uno hace
con una tarjeta de verdad.

Queda una pista colgando de la hoja mientras está tapada, porque sin el botón
no hay nada que diga que la carta se toca.
"""
import io

s = io.open('gen.py', encoding='utf-8').read()

# ---------------------------------------------------------------- pista
viejo = """def quiz(w, h, kana='あ'):"""
nuevo = '''def pista_tocar(movil):
    """«tocá la carta para revelar», colgando de la hoja.

    Sólo en teléfono y sólo mientras la carta está tapada: en escritorio está
    el botón y está la barra espaciadora, y una vez revelada, que se vuelva a
    tocar para ocultar ya se deduce. Es una instrucción que se lee una vez y
    después estorba, así que va en el gris más apagado y un escalón más chica
    que el resto.
    """
    if not movil:
        return ''
    return (f'<span style="font-size: 11px; line-height: 1.4; color: {P["ink3"]}">'
            f'tocá la carta para revelar</span>')


def quiz(w, h, kana='あ'):'''
assert viejo in s
s = s.replace(viejo, nuevo, 1)

# ---------------------------------------------------------------- quiz
viejo = """    if movil:
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; gap: 8px; width: 100%; '
                       f'justify-content: space-between">{inp}{der}</span>')
        caja = ('display: flex; flex-direction: column; align-items: center; justify-content: center; '
                'gap: 12px; padding: 12px')"""
nuevo = """    if movil:
        # Sin «Revelar»: en teléfono revelar es tocar la carta. El input se
        # queda con todo el ancho de la barra, que es lo único que ahí hace
        # falta -y con el teclado abierto es también lo único que se ve-.
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; width: 100%">'
                       f'{inp}</span>')
        caja = ('display: flex; flex-direction: column; align-items: center; justify-content: center; '
                'gap: 12px; padding: 12px')"""
assert viejo in s
s = s.replace(viejo, nuevo, 1)

# el input del quiz pasa a ocupar el ancho en teléfono
viejo = """    inp = (f'<span style="width: {214 if movil else 300}px; height: 36px; border-radius: 7px; '"""
nuevo = """    inp = (f'<span style="{"flex: 1 1 0; " if movil else f"width: 300px; "}height: 36px; border-radius: 7px; '"""
assert viejo in s
s = s.replace(viejo, nuevo, 1)

viejo = """             f'gap: {18 if movil else 26}px">{hoja_quiz(kana, lado, disponible, 44 if movil else 80)}'
             f'{carta_n_de_m("carta 3 de 5")}</div>')"""
nuevo = """             f'gap: {18 if movil else 26}px">{hoja_quiz(kana, lado, disponible, 44 if movil else 80)}'
             f'{pista_tocar(movil)}{carta_n_de_m("carta 3 de 5")}</div>')"""
assert viejo in s
s = s.replace(viejo, nuevo, 1)

# ---------------------------------------------------------------- significados
viejo = """    if movil:
        # Sin teclas. Acá no hay ningún campo que abra el teclado -de eso se
        # trata el modo-, así que anunciar «Espacio» y «Esc» es prometer algo
        # que en un teléfono no existe. Los tres botones a ancho completo.
        der = boton(rotulo, h=30, fs=13, crecer=True)
        juntos = [boton('No la sabía', 'peligro', h=30, fs=13, crecer=True),
                  boton('La sabía', 'primario', h=30, fs=13, crecer=True), der]"""
nuevo = """    if movil:
        # Sin teclas: acá no hay ningún campo que abra el teclado -de eso se
        # trata el modo-, así que anunciar «Espacio» y «Esc» es prometer algo
        # que en un teléfono no existe. Y sin «Revelar»: ahí revelar es tocar
        # la carta, así que la barra queda con los dos de calificarse
        # repartiéndose el ancho, que son la decisión de verdad.
        juntos = [boton('La sabía', 'primario', h=30, fs=13, crecer=True),
                  boton('No la sabía', 'peligro', h=30, fs=13, crecer=True)]"""
assert viejo in s
s = s.replace(viejo, nuevo, 1)

viejo = """             f'{hoja_quiz("けんきゅうしゃ", lado, disponible, 44 if movil else 80)}{slot}'
             f'{carta_n_de_m("carta 4 de 30")}</div>')"""
nuevo = """             f'{hoja_quiz("けんきゅうしゃ", lado, disponible, 44 if movil else 80)}{slot}'
             f'{"" if revelado else pista_tocar(movil)}{carta_n_de_m("carta 4 de 30")}</div>')"""
assert viejo in s
s = s.replace(viejo, nuevo, 1)

# el 1 es «La sabía»: la tecla la da la posición, no la respuesta
viejo = """        centro = (f'<span style="display: flex; align-items: center; gap: 8px">'
                  f'{tecla("1")}{calif[0]}{tecla("2")}{calif[1]}</span>')"""
nuevo = """        # «La sabía» primero, y por lo tanto con el 1: la tecla la da la
        # POSICIÓN y no la respuesta -1 es «el primero de los dos»-, que es el
        # motivo por el que son números y no iniciales. Y primero la
        # afirmativa porque es la esperada: en un repaso la mayoría de las
        # cartas se saben, así que el camino corto tiene que ser ése.
        centro = (f'<span style="display: flex; align-items: center; gap: 8px">'
                  f'{tecla("1")}{calif[1]}{tecla("2")}{calif[0]}</span>')"""
assert viejo in s
s = s.replace(viejo, nuevo, 1)

io.open('gen.py', 'w', encoding='utf-8', newline='\n').write(s)
print('gen.py actualizado')

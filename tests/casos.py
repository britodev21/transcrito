"""
Documentos sinteticos pra exercitar as regras de destaque.

Os exemplos reais nao cobrem todas: o time-card-01 tem datas perfeitamente
sequenciais, entao nele so uma regra dispara. Cada caso daqui liga uma regra
especifica e traz o destaque esperado de cada linha. Os mesmos casos servem ao
teste das cores do xlsx e ao de paridade com a tela.
"""

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIRETORIO_EXEMPLOS = RAIZ / "exemplos"
DIRETORIO_SAIDAS = RAIZ / "saidas"

VERMELHO = "vermelho"
AMARELO = "amarelo"


def ler_saida(nome):
    with open(DIRETORIO_SAIDAS / f"{nome}.json", encoding="utf-8") as arquivo:
        return json.load(arquivo)


# ---------------------------------------------------------------------------
# Cartao de ponto
# ---------------------------------------------------------------------------


def dia(date_raw, *horarios):
    """Um dia com as batidas na ordem dada, alternando IN e OUT."""
    return {
        "date_raw": date_raw,
        "punches": [
            {
                "kind": "IN" if indice % 2 == 0 else "OUT",
                "time_raw": horario,
                "time_hhmm": horario,
            }
            for indice, horario in enumerate(horarios)
        ],
    }


def cartao(*paginas):
    """Cada argumento e a lista de dias de uma pagina."""
    return {
        "pages": [
            {"page": numero, "days": list(dias)}
            for numero, dias in enumerate(paginas, start=1)
        ]
    }


CASOS_CARTAO_PONTO = {
    "sequencial": (
        cartao([dia("01/07/2012", "08:00", "12:00"), dia("02/07/2012")]),
        [None, None],
    ),
    "data_pulada": (
        cartao([dia("01/07/2012", "08:00", "12:00"), dia("03/07/2012")]),
        [None, VERMELHO],
    ),
    "data_repetida": (
        cartao([dia("01/07/2012"), dia("01/07/2012")]),
        [None, VERMELHO],
    ),
    "batida_impar": (
        cartao([dia("01/07/2012", "08:00", "12:00", "13:00")]),
        [AMARELO],
    ),
    "leitura_incerta": (
        cartao([dia("01/07/2012", "0?:25", "12:00")]),
        [AMARELO],
    ),
    "data_ilegivel_nao_quebra_a_cadeia": (
        cartao([
            dia("01/07/2012"),
            dia("??/??/????"),
            dia("02/07/2012"),
        ]),
        [None, AMARELO, None],
    ),
    "vermelho_ganha_do_amarelo": (
        cartao([dia("01/07/2012"), dia("05/07/2012", "08:00")]),
        [None, VERMELHO],
    ),
    "virada_de_pagina_e_de_mes": (
        cartao([dia("31/07/2012")], [dia("01/08/2012")]),
        [None, None],
    ),
}


# ---------------------------------------------------------------------------
# Holerite
# ---------------------------------------------------------------------------


def verba(label, value, code="001"):
    return {"code": code, "label": label, "reference": "", "value": value}


def pagina(page, month, year, *fields, folha=None):
    resultado = {"page": page, "year": year, "month": month}

    if folha is not None:
        resultado["folha"] = folha

    resultado["fields"] = list(fields)
    return resultado


def holerite(*paginas):
    return {"pages": list(paginas)}


SALARIO = verba("SALARIO", "1.000,00")

CASOS_HOLERITE = {
    "virada_de_ano_e_consecutiva": (
        holerite(pagina(1, "12", "2017", SALARIO), pagina(2, "01", "2018", SALARIO)),
        [None, None],
    ),
    "mes_pulado": (
        holerite(pagina(1, "01", "2018", SALARIO), pagina(2, "03", "2018", SALARIO)),
        [None, VERMELHO],
    ),
    "mes_voltando": (
        holerite(pagina(1, "02", "2018", SALARIO), pagina(2, "01", "2018", SALARIO)),
        [None, VERMELHO],
    ),
    "duas_folhas_do_mesmo_mes": (
        holerite(
            pagina(1, "08", "2018", SALARIO, folha="MÊS"),
            pagina(1, "08", "2018", verba("DIFERENCA", "10,00"), folha="ACERTO"),
            pagina(2, "09", "2018", SALARIO, folha="MÊS"),
        ),
        [None, None, None],
    ),
    "pagina_vazia": (
        holerite(pagina(1, "01", "2018", SALARIO), pagina(2, "02", "2018")),
        [None, AMARELO],
    ),
    "valor_incerto": (
        holerite(pagina(1, "01", "2018", verba("SALARIO", "1.?00,00"))),
        [AMARELO],
    ),
    "competencia_ilegivel_nao_quebra_a_cadeia": (
        holerite(
            pagina(1, "01", "2018", SALARIO),
            pagina(2, "?2", "2018", SALARIO),
            pagina(3, "02", "2018", SALARIO),
        ),
        [None, AMARELO, None],
    ),
    "verba_repetida_na_mesma_folha": (
        holerite(
            pagina(
                1,
                "01",
                "2018",
                verba("CONTRIBUICAO NEGOCIAL", "-10,00"),
                verba("CONTRIBUICAO NEGOCIAL", "-12,00"),
            ),
        ),
        [None],
    ),
}


def todos_os_casos():
    """(nome, tipo, value, destaques esperados) de cada caso sintetico."""
    for nome, (value, esperado) in CASOS_CARTAO_PONTO.items():
        yield nome, "cartao-ponto", value, esperado

    for nome, (value, esperado) in CASOS_HOLERITE.items():
        yield nome, "holerite", value, esperado

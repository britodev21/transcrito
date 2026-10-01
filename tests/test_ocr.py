"""
Partes do modulo de OCR que nao dependem do tesseract.

A chamada ao tesseract em si fica no teste de regressao dos escaneados; aqui
entram as decisoes tomadas em cima do que ele devolve.
"""

from backend.ocr import (
    LIMIAR_CONFIANCA,
    LIMIAR_TEXTO_UTIL,
    ler_confianca,
    marcar_incerteza,
    montar_linhas,
    precisa_de_ocr,
)


def test_palavra_confiavel_sai_como_veio():
    assert marcar_incerteza("10:35", LIMIAR_CONFIANCA) == "10:35"


def test_palavra_incerta_troca_so_o_conteudo_e_mantem_a_pontuacao():
    assert marcar_incerteza("10:35", LIMIAR_CONFIANCA - 1) == "??:??"
    assert marcar_incerteza("01/07/2012", 10) == "??/??/????"
    assert marcar_incerteza("1.234,56", 0) == "?.???,??"


def test_tarja_de_assinatura_nao_conta_como_texto_util():
    # A tarja do payroll-04 da 83 caracteres por pagina.
    assert precisa_de_ocr("x" * 83)
    assert precisa_de_ocr("x" * (LIMIAR_TEXTO_UTIL - 1))
    assert not precisa_de_ocr("x" * LIMIAR_TEXTO_UTIL)


def test_pagina_sem_camada_de_texto_precisa_de_ocr():
    assert precisa_de_ocr(None)
    assert precisa_de_ocr("   \n  ")


def test_confianca_ilegivel_vira_zero_e_conta_como_incerta():
    assert ler_confianca("95.5") == 95.5
    assert ler_confianca(42) == 42.0
    assert ler_confianca("abc") == 0.0
    assert ler_confianca(None) == 0.0


def test_montar_linhas_reconstroi_a_ordem_do_papel():
    """
    O tesseract emite palavras fora da ordem de leitura as vezes; a linha sai
    ordenada por (bloco, paragrafo, linha). Palavra vazia e entrada estrutural
    e nao entra nem na contagem.
    """
    dados = {
        "text": ["", "Saida", "18:36", "Entrada", "09:03", "  "],
        "conf": ["-1", "96", "40", "91", "88", "-1"],
        "block_num": [1, 1, 1, 1, 1, 1],
        "par_num": [1, 1, 1, 1, 1, 1],
        "line_num": [1, 2, 2, 1, 1, 2],
    }

    linhas, total, incertas = montar_linhas(dados)

    assert linhas == ["Entrada 09:03", "Saida ??:??"]
    assert total == 4
    assert incertas == 1

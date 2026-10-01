"""
Paridade entre a tabela da tela e a planilha baixada.

O frontend/src/regrasTabela.js reimplementa em JavaScript as regras do
backend/planilha.py, e o comentario no topo dele promete que as duas batem.
Este teste cobra a promessa: monta a tabela nas duas implementacoes sobre o
mesmo dado e compara colunas, celulas e destaques. Sem ele, a tela poderia
mostrar uma coisa e o arquivo baixado outra.
"""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

from backend.planilha import tabela_cartao_ponto, tabela_holerite
from tests.casos import AMARELO, VERMELHO, ler_saida, todos_os_casos

SCRIPT = Path(__file__).with_name("paridade.mjs")
NODE = shutil.which("node")

# Localmente, sem node, o teste e pulado. No CI nao: la ele tem que rodar, e
# um skip silencioso esconderia a paridade quebrada.
pytestmark = pytest.mark.skipif(
    NODE is None and not os.environ.get("CI"),
    reason="node nao instalado",
)

CASOS = [(nome, tipo, value) for nome, tipo, value, _esperado in todos_os_casos()]
CASOS += [
    (nome, tipo, ler_saida(nome))
    for nome, tipo in [
        ("time-card-01", "cartao-ponto"),
        ("time-card-02", "cartao-ponto"),
        ("payroll-02", "holerite"),
        ("payroll-03", "holerite"),
    ]
]


def tabela_do_backend(tipo, value):
    """
    Poe a Tabela do backend no formato que a tela usa.

    A tela guarda tudo como texto e completa a linha ate a largura das
    colunas; a planilha guarda o numero da pagina como numero e deixa a linha
    curta. Isso e forma, nao regra, entao e normalizado aqui. O destaque segue
    a mesma precedencia do escrever_linha: vermelho ganha do amarelo.
    """
    montar = tabela_holerite if tipo == "holerite" else tabela_cartao_ponto
    tabela = montar(value)
    largura = len(tabela.cabecalho)

    linhas = []
    for valores, aviso in zip(tabela.linhas, tabela.avisos, strict=True):
        celulas = ["" if valor is None else str(valor) for valor in valores]
        celulas += [""] * (largura - len(celulas))

        if aviso["nao_sequencial"]:
            destaque = VERMELHO
        elif aviso["amarelo"]:
            destaque = AMARELO
        else:
            destaque = None

        linhas.append({"celulas": celulas, "destaque": destaque})

    return {"colunas": list(tabela.cabecalho), "linhas": linhas}


def tabela_da_tela(tabela):
    """O numero da pagina chega como numero do JSON; o resto ja e texto."""
    return {
        "colunas": tabela["colunas"],
        "linhas": [
            {
                "celulas": [str(celula) for celula in linha["celulas"]],
                "destaque": linha["destaque"],
            }
            for linha in tabela["linhas"]
        ],
    }


@pytest.fixture(scope="module")
def tabelas_da_tela():
    """Roda o node uma vez so pra todos os casos: subir o processo e o caro."""
    entrada = [{"tipo": tipo, "value": value} for _nome, tipo, value in CASOS]

    resultado = subprocess.run(
        [NODE or "node", str(SCRIPT)],
        input=json.dumps(entrada, ensure_ascii=False),
        capture_output=True,
        encoding="utf-8",
        check=True,
    )

    tabelas = json.loads(resultado.stdout)
    return {
        nome: tabela
        for (nome, *_resto), tabela in zip(CASOS, tabelas, strict=True)
    }


@pytest.mark.parametrize(
    ("nome", "tipo", "value"), CASOS, ids=[nome for nome, *_resto in CASOS]
)
def test_tela_e_planilha_montam_a_mesma_tabela(nome, tipo, value, tabelas_da_tela):
    assert tabela_da_tela(tabelas_da_tela[nome]) == tabela_do_backend(tipo, value)

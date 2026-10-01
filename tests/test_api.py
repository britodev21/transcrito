"""
API de ponta a ponta: upload, processamento, correcao e download.

Cada teste roda com uploads/ e planilhas/ apontando pra uma pasta temporaria e
o dicionario de transcricoes vazio. O TestClient e usado sem "with" de
proposito: o "with" dispara o ciclo de vida, que apaga os arquivos dessas
pastas, e o teste que exercita a limpeza faz isso explicitamente.
"""

import csv
import io

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend import main
from tests.casos import DIRETORIO_EXEMPLOS, ler_saida

PDF_CARTAO = DIRETORIO_EXEMPLOS / "time-card-01.pdf"


@pytest.fixture
def pastas(tmp_path, monkeypatch):
    uploads = tmp_path / "uploads"
    planilhas = tmp_path / "planilhas"
    uploads.mkdir()
    planilhas.mkdir()

    monkeypatch.setattr(main, "DIRETORIO_UPLOADS", uploads)
    monkeypatch.setattr(main, "DIRETORIO_PLANILHAS", planilhas)
    monkeypatch.setattr(main, "transcricoes", {})

    return uploads, planilhas


@pytest.fixture
def cliente(pastas):
    return TestClient(main.app)


def enviar(cliente, conteudo, tipo="cartao-ponto", nome="documento.pdf"):
    return cliente.post(
        "/api/transcricoes",
        files={"arquivo": (nome, conteudo, "application/pdf")},
        data={"tipo": tipo},
    )


@pytest.fixture
def transcricao_pronta(cliente):
    """
    Sobe o time-card-01 e devolve o id. O TestClient so devolve a resposta
    depois que a tarefa em background termina, entao aqui ela ja esta pronta.
    """
    resposta = enviar(cliente, PDF_CARTAO.read_bytes())
    assert resposta.status_code == 202
    return resposta.json()["id"]


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------


def test_healthz(cliente):
    resposta = cliente.get("/healthz")
    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok"}


def test_tipo_invalido_e_recusado(cliente, pastas):
    resposta = enviar(cliente, PDF_CARTAO.read_bytes(), tipo="nota-fiscal")

    assert resposta.status_code == 400
    assert list(pastas[0].iterdir()) == []


def test_arquivo_que_nao_e_pdf_e_recusado_sem_gravar_nada(cliente, pastas):
    # A extensao diz .pdf; os bytes nao.
    resposta = enviar(cliente, b"nao sou um pdf", nome="falso.pdf")

    assert resposta.status_code == 400
    assert list(pastas[0].iterdir()) == []
    assert main.transcricoes == {}


def test_nome_do_arquivo_enviado_nao_e_usado_no_disco(cliente, pastas):
    resposta = enviar(cliente, PDF_CARTAO.read_bytes(), nome="../../fora.pdf")
    id_ = resposta.json()["id"]

    assert [p.name for p in pastas[0].iterdir()] == [f"{id_}.pdf"]


def test_pdf_quebrado_vira_erro_generico(cliente):
    # Passa na assinatura, mas o parser nao consegue abrir.
    resposta = enviar(cliente, b"%PDF-1.4\nlixo")
    transcricao = cliente.get(f"/api/transcricoes/{resposta.json()['id']}").json()

    assert transcricao["status"] == "erro"
    assert transcricao["erro"] == main.MENSAGEM_ERRO
    assert transcricao["value"] is None


# ---------------------------------------------------------------------------
# Ciclo completo
# ---------------------------------------------------------------------------


def test_transcricao_concluida_traz_o_value_do_extrator(cliente, transcricao_pronta):
    transcricao = cliente.get(f"/api/transcricoes/{transcricao_pronta}").json()

    assert transcricao["status"] == "concluido"
    assert transcricao["tipo"] == "cartao-ponto"
    assert transcricao["erro"] is None
    assert transcricao["value"] == ler_saida("time-card-01")


def test_documento_original_abre_inline(cliente, transcricao_pronta):
    resposta = cliente.get(f"/api/transcricoes/{transcricao_pronta}/documento")

    assert resposta.status_code == 200
    assert resposta.headers["content-type"] == "application/pdf"
    assert resposta.headers["content-disposition"] == "inline"
    assert resposta.content == PDF_CARTAO.read_bytes()


def test_planilha_sai_com_a_correcao_aplicada(cliente, transcricao_pronta):
    url = f"/api/transcricoes/{transcricao_pronta}"
    value = cliente.get(url).json()["value"]

    dia = value["pages"][0]["days"][1]
    dia["punches"][0]["time_hhmm"] = "07:59"

    assert cliente.put(url, json={"value": value}).status_code == 200

    assert cliente.get(f"{url}/planilha?formato=json").json() == value

    resposta = cliente.get(f"{url}/planilha?formato=csv")
    texto = resposta.content.decode("utf-8-sig")
    linhas = list(csv.reader(io.StringIO(texto), delimiter=";"))
    linha_do_dia = next(linha for linha in linhas if linha[0] == dia["date_raw"])
    assert linha_do_dia[1] == "07:59"


@pytest.mark.parametrize(
    ("formato", "tipo_de_midia"),
    [
        ("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("csv", "text/csv; charset=utf-8"),
        ("json", "application/json"),
    ],
)
def test_download_nos_tres_formatos(
    cliente, transcricao_pronta, formato, tipo_de_midia
):
    resposta = cliente.get(
        f"/api/transcricoes/{transcricao_pronta}/planilha?formato={formato}"
    )

    assert resposta.status_code == 200
    assert resposta.headers["content-type"] == tipo_de_midia
    assert (
        f'filename="cartao-ponto-{transcricao_pronta[:8]}.{formato}"'
        in resposta.headers["content-disposition"]
    )


def test_formato_invalido_e_recusado(cliente, transcricao_pronta):
    url = f"/api/transcricoes/{transcricao_pronta}/planilha?formato=pdf"
    resposta = cliente.get(url)
    assert resposta.status_code == 400


def test_planilha_de_transcricao_em_andamento_e_conflito(cliente):
    main.transcricoes["em-andamento"] = {
        "id": "em-andamento",
        "tipo": "cartao-ponto",
        "status": "processando",
        "erro": None,
        "value": None,
    }

    resposta = cliente.get("/api/transcricoes/em-andamento/planilha")
    assert resposta.status_code == 409


# ---------------------------------------------------------------------------
# Ids que nao existem e caminhos que escapam
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("metodo", "rota"),
    [
        ("get", "/api/transcricoes/inexistente"),
        ("get", "/api/transcricoes/inexistente/documento"),
        ("get", "/api/transcricoes/inexistente/planilha"),
        ("put", "/api/transcricoes/inexistente"),
    ],
)
def test_id_inexistente_e_404(cliente, metodo, rota):
    argumentos = {"json": {"value": {}}} if metodo == "put" else {}
    assert getattr(cliente, metodo)(rota, **argumentos).status_code == 404


def test_documento_nao_sai_de_uploads_mesmo_com_id_registrado(pastas, tmp_path):
    """
    A segunda barreira da rota do documento. Pela URL um id com "/" nem chega
    a casar a rota, entao a funcao e chamada direto: o que se testa e o
    is_relative_to, com um arquivo de verdade esperando do lado de fora.
    """
    (tmp_path / "segredo.pdf").write_bytes(b"%PDF-1.4 de outra pessoa")
    main.transcricoes["../segredo"] = {"status": "concluido"}

    with pytest.raises(HTTPException) as erro:
        main.get_documento("../segredo")

    assert erro.value.status_code == 404


# ---------------------------------------------------------------------------
# Limpeza de inicio
# ---------------------------------------------------------------------------


def test_subida_esvazia_uploads_e_planilhas(pastas):
    uploads, planilhas = pastas
    (uploads / "orfao.pdf").write_bytes(b"%PDF")
    (planilhas / "orfa.xlsx").write_bytes(b"")
    (uploads / "subpasta").mkdir()

    with TestClient(main.app):
        pass

    # Arquivo solto sai; pasta fica, porque a limpeza nao e recursiva.
    assert [p.name for p in uploads.iterdir()] == ["subpasta"]
    assert list(planilhas.iterdir()) == []

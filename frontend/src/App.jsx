import { useEffect, useState } from 'react'
import { ArrowCounterClockwise, GithubLogo } from '@phosphor-icons/react'
import Amostra from './Amostra'
import Envio from './Envio'
import { Falha, Progresso } from './Progresso'
import Revisao from './Revisao'
import { rotuloDoTipo } from './tipos'
import './App.css'

const INTERVALO_POLLING = 2000

// Mesmo teto do backend (LIMITE_UPLOAD_MB no main.py). Conferir aqui poupa
// mandar o arquivo inteiro pela rede só pra ouvir um 413.
const LIMITE_UPLOAD_MB = 20

const REPOSITORIO = 'https://github.com/britodev21/transcrito'

/*
 * Tira o nome do arquivo do Content-Disposition que o backend manda, pra o
 * arquivo salvo ter o mesmo nome que teria num download direto.
 */
function nomeDoAnexo(cabecalho) {
  const casamento = /filename="?([^"]+)"?/.exec(cabecalho ?? '')
  return casamento?.[1] ?? null
}

function App() {
  const [arquivo, setArquivo] = useState(null)
  const [tipo, setTipo] = useState('cartao-ponto')
  const [id, setId] = useState(null)
  const [transcricao, setTranscricao] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [segundos, setSegundos] = useState(0)

  const [valueSalvo, setValueSalvo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [salvou, setSalvou] = useState(false)
  const [formato, setFormato] = useState('xlsx')
  const [erroAcao, setErroAcao] = useState(null)


  const status = transcricao?.status ?? null
  const processando = Boolean(id) && status !== 'concluido' && status !== 'erro'

  /*
   * Comparação por referência basta: toda edição devolve um objeto novo, e o
   * valueSalvo guarda exatamente a referência que foi enviada no último PUT.
   */
  const pendente = Boolean(transcricao?.value) && transcricao.value !== valueSalvo

  /*
   * Polling: consulta a transcrição a cada 2s até o status parar de mudar.
   *
   * Depende de `status` e não do objeto inteiro: enquanto for "processando" a
   * string não muda, o efeito não reinicia e o intervalo sobrevive entre as
   * consultas. Quando vira "concluido" ou "erro", o efeito roda de novo, a
   * limpeza mata o intervalo antigo e ele retorna cedo sem criar outro.
   */
  useEffect(() => {
    if (!id) return
    if (status === 'concluido' || status === 'erro') return

    let cancelado = false

    async function consultar() {
      try {
        const resposta = await fetch(`/api/transcricoes/${id}`)

        if (!resposta.ok) {
          throw new Error(`A consulta falhou (HTTP ${resposta.status}).`)
        }

        const dados = await resposta.json()
        // O cancelado evita escrever estado depois que o efeito foi limpo,
        // que é o que acontece no duplo-monta do StrictMode.
        if (cancelado) return

        setTranscricao(dados)

        // O que acabou de chegar é, por definição, o que está no servidor:
        // marca como salvo pra não nascer com "alterações pendentes".
        if (dados.status === 'concluido') setValueSalvo(dados.value)
      } catch (causa) {
        if (!cancelado) setErro(causa.message)
      }
    }

    // Consulta já na primeira volta, sem esperar os 2s.
    consultar()
    const relogio = setInterval(consultar, INTERVALO_POLLING)

    return () => {
      cancelado = true
      clearInterval(relogio)
    }
  }, [id, status])

  // Contador de tempo. Um spinner sozinho fica igual estando o backend
  // trabalhando ou travado; o relógio andando mostra qual dos dois é.
  useEffect(() => {
    if (!processando) return

    const relogio = setInterval(() => setSegundos((atual) => atual + 1), 1000)
    return () => clearInterval(relogio)
  }, [processando])

  // O submit do formulário fica no Envio, que já faz o preventDefault.
  async function enviar() {
    if (!arquivo || enviando) return

    setEnviando(true)
    setErro(null)
    setTranscricao(null)
    setId(null)
    setSegundos(0)

    try {
      if (arquivo.size > LIMITE_UPLOAD_MB * 1024 * 1024) {
        throw new Error(`O arquivo passa do limite de ${LIMITE_UPLOAD_MB} MB.`)
      }

      const corpo = new FormData()
      corpo.append('arquivo', arquivo)
      corpo.append('tipo', tipo)

      const resposta = await fetch('/api/transcricoes', {
        method: 'POST',
        body: corpo,
      })

      const dados = await resposta.json().catch(() => ({}))

      if (!resposta.ok) {
        // O backend recusa tipo inválido e não-PDF com 400 e um detail
        // legível; mostra ele em vez de um "erro 400" seco.
        throw new Error(dados.detail ?? `O envio falhou (HTTP ${resposta.status}).`)
      }

      setId(dados.id)
    } catch (causa) {
      setErro(causa.message)
    } finally {
      setEnviando(false)
    }
  }

  /*
   * A edição de célula troca o value dentro da transcrição em memória. Só
   * chega aqui depois de "concluido", quando o polling já parou - senão a
   * próxima consulta sobrescreveria a correção com o que veio do servidor.
   */
  function editarValue(novoValue) {
    setTranscricao((atual) => ({ ...atual, value: novoValue }))
    setErroAcao(null)
  }

  /*
   * Devolve true quando o servidor ficou com o value atual. Quem chama usa
   * isso pra decidir se pode seguir - o download depende disso.
   */
  async function salvar() {
    const paraSalvar = transcricao.value

    setSalvando(true)
    setErroAcao(null)

    try {
      const resposta = await fetch(`/api/transcricoes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: paraSalvar }),
      })

      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}))
        throw new Error(dados.detail ?? `Não foi possível salvar (HTTP ${resposta.status}).`)
      }

      /*
       * Guarda a referência que foi enviada, e não transcricao.value: se a
       * pessoa editou enquanto o PUT estava no ar, o pendente volta a ser
       * verdadeiro sozinho, que é o correto.
       */
      setValueSalvo(paraSalvar)
      setSalvou(true)
      return true
    } catch (causa) {
      setErroAcao(causa.message)
      return false
    } finally {
      setSalvando(false)
    }
  }

  async function baixar() {
    setErroAcao(null)

    /*
     * Salva antes de baixar quando há pendência. Se o PUT falhar, aborta: o
     * backend gera a planilha do value que ele tem, então baixar aqui
     * entregaria um arquivo sem as correções e sem ninguém perceber.
     */
    if (pendente && !(await salvar())) return

    setBaixando(true)

    try {
      const resposta = await fetch(
        `/api/transcricoes/${id}/planilha?formato=${formato}`,
      )

      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}))
        throw new Error(dados.detail ?? `O download falhou (HTTP ${resposta.status}).`)
      }

      /*
       * Vai por blob e link com download em vez de navegar pra URL: assim dá
       * pra checar o status antes e um erro do backend não substitui a página
       * por um JSON de erro numa aba.
       */
      const conteudo = await resposta.blob()
      const nome =
        nomeDoAnexo(resposta.headers.get('content-disposition')) ??
        `${transcricao.tipo}.${formato}`

      const endereco = URL.createObjectURL(conteudo)
      const link = document.createElement('a')
      link.href = endereco
      link.download = nome

      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(endereco)
    } catch (causa) {
      setErroAcao(causa.message)
    } finally {
      setBaixando(false)
    }
  }

  function recomecar() {
    setArquivo(null)
    setId(null)
    setTranscricao(null)
    setErro(null)
    setSegundos(0)
    setValueSalvo(null)
    setSalvou(false)
    setErroAcao(null)
  }

  const revisando = status === 'concluido'
  const rotuloTipo = rotuloDoTipo(transcricao?.tipo ?? tipo)

  /*
   * O cartão da direita troca de papel conforme a etapa: escolher o arquivo,
   * acompanhar o processamento ou mostrar a falha. A página em volta fica
   * parada, então a pessoa não perde o lugar entre um estado e outro.
   */
  let cartao
  if (status === 'erro') {
    cartao = (
      <Falha
        arquivo={arquivo}
        rotuloTipo={rotuloTipo}
        mensagem={transcricao.erro}
        aoRecomecar={recomecar}
      />
    )
  } else if (processando) {
    cartao = <Progresso arquivo={arquivo} rotuloTipo={rotuloTipo} segundos={segundos} />
  } else {
    cartao = (
      <Envio
        arquivo={arquivo}
        tipo={tipo}
        enviando={enviando}
        limiteMb={LIMITE_UPLOAD_MB}
        erro={erro}
        aoEscolherArquivo={(novo) => {
          setArquivo(novo)
          setErro(null)
        }}
        aoEscolherTipo={setTipo}
        aoEnviar={enviar}
      />
    )
  }

  return (
    <div className={revisando ? 'app amplo' : 'app'}>
      <header className="topo">
        <div className="topo-conteudo">
          <a className="marca" href="/">
            <img src="/favicon.svg" alt="" width="28" height="28" />
            Transcrito
          </a>

          <nav className="topo-acoes" aria-label="Atalhos">
            {revisando && (
              <button type="button" className="botao fantasma" onClick={recomecar}>
                <ArrowCounterClockwise size={18} aria-hidden="true" />
                Novo envio
              </button>
            )}
            <a
              className="botao fantasma"
              href={REPOSITORIO}
              target="_blank"
              rel="noreferrer"
              aria-label="Código no GitHub"
            >
              <GithubLogo size={18} aria-hidden="true" />
              <span className="some-no-celular">Código</span>
            </a>
          </nav>
        </div>
      </header>

      <main className="conteudo">
        {revisando ? (
          <Revisao
            id={id}
            nomeArquivo={arquivo?.name ?? 'Transcrição'}
            rotuloTipo={rotuloTipo}
            tipo={transcricao.tipo}
            value={transcricao.value}
            pendente={pendente}
            salvou={salvou}
            salvando={salvando}
            baixando={baixando}
            formato={formato}
            erroAcao={erroAcao}
            aoEditar={editarValue}
            aoSalvar={salvar}
            aoBaixar={baixar}
            aoMudarFormato={setFormato}
          />
        ) : (
          <>
            <section className="abertura">
              <div className="abertura-texto">
                <h1>Do PDF à planilha, conferido linha a linha.</h1>
                <p>
                  Envie um cartão de ponto ou holerite. Revise o que ficou marcado e
                  baixe em xlsx, csv ou json.
                </p>
              </div>

              {cartao}
            </section>

            <section className="explica" aria-labelledby="titulo-explica">
              <div className="explica-texto">
                <h2 id="titulo-explica">Você confere só o que foi marcado.</h2>
                <p>
                  <span className="marca-amarela">Amarelo</span> pede uma olhada: batida
                  ímpar, leitura incerta do OCR ou página sem verbas.{' '}
                  <span className="marca-vermelha">Vermelho</span> aponta data ou
                  competência fora de sequência. As mesmas cores saem no xlsx.
                </p>
              </div>

              <figure className="explica-amostra">
                <Amostra />
                <figcaption>
                  Trecho do cartão de ponto de exemplo, sem o dia 31/10 para mostrar o
                  aviso de sequência.
                </figcaption>
              </figure>
            </section>
          </>
        )}
      </main>

      <footer className="rodape">
        <div className="rodape-conteudo">
          <span>Transcrito</span>
          <a href={REPOSITORIO} target="_blank" rel="noreferrer">
            Código no GitHub
          </a>
          <a href="https://github.com/britodev21" target="_blank" rel="noreferrer">
            Desenvolvido por britodev21
          </a>
        </div>
      </footer>
    </div>
  )
}

export default App

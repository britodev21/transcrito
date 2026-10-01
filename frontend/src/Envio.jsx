import { useEffect, useRef, useState } from 'react'
import { ArrowRight, FilePdf, ShieldCheck, UploadSimple, X } from '@phosphor-icons/react'
import { tamanhoLegivel } from './formatos'
import { TIPOS } from './tipos'

/*
 * PDFs de exemplo servidos pelo próprio site (frontend/public/exemplos). Quem
 * chega pelo portfólio quase nunca tem um cartão de ponto à mão, e sem isso a
 * única coisa que dá pra ver é o formulário.
 */
const EXEMPLOS = {
  'cartao-ponto': { caminho: '/exemplos/cartao-de-ponto.pdf', nome: 'cartao-de-ponto-exemplo.pdf' },
  holerite: { caminho: '/exemplos/holerite.pdf', nome: 'holerite-exemplo.pdf' },
}

function ehPdf(arquivo) {
  return arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name)
}

function Envio({
  arquivo,
  tipo,
  enviando,
  limiteMb,
  erro,
  aoEscolherArquivo,
  aoEscolherTipo,
  aoEnviar,
}) {
  const campo = useRef(null)
  const [arrastando, setArrastando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [buscandoExemplo, setBuscandoExemplo] = useState(null)

  // O input de arquivo é não-controlado: quando o arquivo sai do estado
  // (remover, novo envio), o campo precisa ser limpo à mão.
  useEffect(() => {
    if (!arquivo && campo.current) campo.current.value = ''
  }, [arquivo])

  /*
   * Confere tipo e tamanho na escolha, e não só no envio: quem arrasta um
   * .docx descobre na hora, em vez de depois de clicar em Transcrever.
   */
  function escolher(novo) {
    if (!novo) return

    if (!ehPdf(novo)) {
      setAviso('Escolha um arquivo PDF.')
      return
    }

    if (novo.size > limiteMb * 1024 * 1024) {
      setAviso(`O arquivo passa do limite de ${limiteMb} MB.`)
      return
    }

    setAviso(null)
    aoEscolherArquivo(novo)
  }

  async function usarExemplo(tipoExemplo) {
    const exemplo = EXEMPLOS[tipoExemplo]
    setBuscandoExemplo(tipoExemplo)
    setAviso(null)

    try {
      const resposta = await fetch(exemplo.caminho)
      if (!resposta.ok) throw new Error()

      const conteudo = await resposta.blob()
      aoEscolherTipo(tipoExemplo)
      aoEscolherArquivo(new File([conteudo], exemplo.nome, { type: 'application/pdf' }))
    } catch {
      setAviso('Não foi possível carregar o exemplo. Tente de novo.')
    } finally {
      setBuscandoExemplo(null)
    }
  }

  const mensagem = aviso ?? erro

  return (
    <form
      className="cartao envio"
      onSubmit={(evento) => {
        evento.preventDefault()
        aoEnviar()
      }}
    >
      <h2 className="so-leitor">Enviar documento</h2>

      <div
        className={['zona', arrastando && 'arrastando', arquivo && 'preenchida']
          .filter(Boolean)
          .join(' ')}
        onDragOver={(evento) => {
          evento.preventDefault()
          if (!enviando) setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(evento) => {
          evento.preventDefault()
          setArrastando(false)
          if (!enviando) escolher(evento.dataTransfer.files?.[0])
        }}
      >
        <input
          ref={campo}
          id="arquivo"
          name="arquivo"
          type="file"
          accept="application/pdf,.pdf"
          className="so-leitor"
          disabled={enviando}
          onChange={(evento) => escolher(evento.target.files?.[0])}
        />

        {arquivo ? (
          <div className="arquivo-escolhido">
            <span className="arquivo-icone" aria-hidden="true">
              <FilePdf size={22} />
            </span>
            <span className="arquivo-dados">
              <strong>{arquivo.name}</strong>
              <span>{tamanhoLegivel(arquivo.size)}</span>
            </span>
            <label htmlFor="arquivo" className="botao fantasma pequeno">
              Trocar
            </label>
            <button
              type="button"
              className="botao fantasma icone-so"
              aria-label="Remover arquivo"
              disabled={enviando}
              onClick={() => aoEscolherArquivo(null)}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label htmlFor="arquivo" className="zona-convite">
            <span className="zona-icone" aria-hidden="true">
              <UploadSimple size={22} />
            </span>
            <span className="zona-texto">
              <strong>Escolha o PDF</strong> ou arraste até aqui
            </span>
            <span className="zona-dica">
              Até {limiteMb} MB, com texto ou escaneado
            </span>
          </label>
        )}
      </div>

      <fieldset className="tipos" disabled={enviando}>
        <legend>Tipo de documento</legend>

        <div className="tipos-opcoes">
          {TIPOS.map(({ valor, rotulo, dica, Icone }) => (
            <label key={valor} className={tipo === valor ? 'tipo marcado' : 'tipo'}>
              <input
                type="radio"
                name="tipo"
                value={valor}
                className="so-leitor"
                checked={tipo === valor}
                onChange={(evento) => aoEscolherTipo(evento.target.value)}
              />
              <Icone size={20} aria-hidden="true" />
              <span className="tipo-rotulo">{rotulo}</span>
              <span className="tipo-dica">{dica}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {mensagem && (
        <p className="erro-campo" role="alert">
          {mensagem}
        </p>
      )}

      <button type="submit" className="botao primario largo" disabled={!arquivo || enviando}>
        {enviando ? 'Enviando…' : 'Transcrever'}
        {!enviando && <ArrowRight size={18} aria-hidden="true" />}
      </button>

      <div className="exemplos">
        <span>Sem um PDF à mão? Use um exemplo:</span>
        <span className="exemplos-botoes">
          {TIPOS.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              className="botao fantasma pequeno"
              disabled={enviando || buscandoExemplo !== null}
              onClick={() => usarExemplo(valor)}
            >
              {buscandoExemplo === valor ? 'Carregando…' : rotulo}
            </button>
          ))}
        </span>
      </div>

      <p className="nota">
        <ShieldCheck size={16} aria-hidden="true" />
        Demonstração pública: prefira os exemplos ou documentos sem dados reais.
      </p>
    </form>
  )
}

export default Envio

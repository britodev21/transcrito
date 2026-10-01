import { CheckCircle, DownloadSimple, FloppyDisk, WarningCircle } from '@phosphor-icons/react'
import Documento from './Documento'
import Tabela from './Tabela'

const FORMATOS = ['xlsx', 'csv', 'json']

/*
 * Tela de revisão: a barra com o que se faz com o resultado e, abaixo, tabela
 * e documento lado a lado. Conferir uma transcrição é comparar as duas
 * coisas, e separá-las em telas diferentes obrigaria a decorar o que estava
 * na outra.
 */
function Revisao({
  id,
  nomeArquivo,
  rotuloTipo,
  value,
  tipo,
  pendente,
  salvou,
  salvando,
  baixando,
  formato,
  erroAcao,
  aoEditar,
  aoSalvar,
  aoBaixar,
  aoMudarFormato,
}) {
  const paginas = new Set(value.pages.map((pagina) => pagina.page)).size

  return (
    <section className="revisao" aria-labelledby="titulo-revisao">
      <div className="revisao-barra">
        <div className="revisao-titulo">
          <h1 id="titulo-revisao">{nomeArquivo}</h1>
          <p>
            <span className="chip">{rotuloTipo}</span>
            {paginas} {paginas === 1 ? 'página' : 'páginas'}. Edite qualquer
            célula para corrigir.
          </p>
        </div>

        <div className="revisao-acoes">
          {/*
            O estado das correções fica sempre visível: pendente avisa que o
            arquivo sairia diferente da tela, e o salvo confirma o PUT. O
            "salvo" some sozinho na próxima edição, porque volta a pendente.
          */}
          <span className="estado" aria-live="polite">
            {pendente ? (
              <span className="estado-pendente">
                <WarningCircle size={16} aria-hidden="true" />
                Alterações não salvas
              </span>
            ) : (
              salvou && (
                <span className="estado-salvo">
                  <CheckCircle size={16} aria-hidden="true" />
                  Correções salvas
                </span>
              )
            )}
          </span>

          <button
            type="button"
            className="botao secundario"
            onClick={aoSalvar}
            disabled={!pendente || salvando}
          >
            <FloppyDisk size={18} aria-hidden="true" />
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>

          <fieldset className="formatos" disabled={salvando || baixando}>
            <legend className="so-leitor">Formato do download</legend>
            {FORMATOS.map((opcao) => (
              <label key={opcao} className={formato === opcao ? 'marcado' : undefined}>
                <input
                  type="radio"
                  name="formato"
                  value={opcao}
                  className="so-leitor"
                  checked={formato === opcao}
                  onChange={() => aoMudarFormato(opcao)}
                />
                {opcao}
              </label>
            ))}
          </fieldset>

          {/* O download salva antes quando há pendência; o rótulo não precisa
              repetir isso, o estado ao lado já avisa. */}
          <button
            type="button"
            className="botao primario"
            onClick={aoBaixar}
            disabled={salvando || baixando}
          >
            <DownloadSimple size={18} aria-hidden="true" />
            {baixando ? 'Baixando…' : 'Baixar'}
          </button>
        </div>
      </div>

      {erroAcao && (
        <div className="alerta" role="alert">
          <WarningCircle size={20} aria-hidden="true" />
          <div>
            <strong>Não deu certo</strong>
            <p>{erroAcao}</p>
          </div>
        </div>
      )}

      <div className="painel">
        <Tabela tipo={tipo} value={value} aoEditar={aoEditar} />
        <Documento id={id} />
      </div>
    </section>
  )
}

export default Revisao

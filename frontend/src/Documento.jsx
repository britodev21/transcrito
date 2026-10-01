import { ArrowSquareOut } from '@phosphor-icons/react'

/*
 * Visualizador do PDF original, pra conferir a transcrição contra o
 * documento sem trocar de janela.
 *
 * Usa o leitor de PDF do próprio navegador num iframe, em vez de trazer uma
 * biblioteca de renderização: o que a tela precisa é mostrar o documento, e o
 * leitor nativo já vem com zoom, busca e paginação prontos.
 */
function Documento({ id }) {
  const endereco = `/api/transcricoes/${id}/documento`

  return (
    <div className="area documento-area">
      <div className="area-topo">
        <span className="area-titulo">PDF original</span>

        {/*
          Escape para quando o navegador não abre PDF embutido - alguns
          bloqueiam por configuração, e aí o iframe fica em branco sem avisar
          ninguém. O link sempre funciona.
        */}
        <a className="link-acao" href={endereco} target="_blank" rel="noreferrer">
          Abrir em nova aba
          <ArrowSquareOut size={15} aria-hidden="true" />
        </a>
      </div>

      <iframe
        className="documento-visor"
        src={endereco}
        title="PDF original da transcrição"
      />
    </div>
  )
}

export default Documento

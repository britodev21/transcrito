import { CheckCircle, CircleNotch, FilePdf, Table, WarningCircle } from '@phosphor-icons/react'
import { minutosESegundos, tamanhoLegivel } from './formatos'

/*
 * O backend só diz "processando" ou "concluido", então a tela mostra só o que
 * sabe de verdade: o envio terminou e a leitura está em andamento. Fases
 * inventadas no meio dariam uma precisão que não existe.
 */
export function Progresso({ arquivo, rotuloTipo, segundos }) {
  return (
    <div className="cartao progresso" role="status" aria-live="polite">
      <ArquivoResumo arquivo={arquivo} rotuloTipo={rotuloTipo} />

      <ol className="fases">
        <li className="fase feita">
          <CheckCircle size={20} weight="fill" aria-hidden="true" />
          <span>Arquivo enviado</span>
        </li>

        <li className="fase atual">
          <CircleNotch size={20} className="gira" aria-hidden="true" />
          <span>
            Lendo o documento
            <small>PDF escaneado passa por OCR e pode levar alguns minutos.</small>
          </span>
          {/* O relógio andando diferencia "trabalhando" de "travado". */}
          <span className="relogio" aria-label={`${segundos} segundos`}>
            {minutosESegundos(segundos)}
          </span>
        </li>

        <li className="fase">
          <Table size={20} aria-hidden="true" />
          <span>Tabela pronta para revisão</span>
        </li>
      </ol>

      <div className="faixa-andamento" aria-hidden="true" />
    </div>
  )
}

export function Falha({ arquivo, rotuloTipo, mensagem, aoRecomecar }) {
  return (
    <div className="cartao falha" role="alert">
      <ArquivoResumo arquivo={arquivo} rotuloTipo={rotuloTipo} />

      <div className="falha-corpo">
        <WarningCircle size={22} aria-hidden="true" />
        <div>
          <strong>A transcrição falhou</strong>
          <p>{mensagem}</p>
        </div>
      </div>

      <button type="button" className="botao primario largo" onClick={aoRecomecar}>
        Novo envio
      </button>
    </div>
  )
}

function ArquivoResumo({ arquivo, rotuloTipo }) {
  return (
    <div className="arquivo-escolhido estatico">
      <span className="arquivo-icone" aria-hidden="true">
        <FilePdf size={22} />
      </span>
      <span className="arquivo-dados">
        <strong>{arquivo?.name ?? 'documento.pdf'}</strong>
        <span>
          {rotuloTipo}
          {arquivo && ` · ${tamanhoLegivel(arquivo.size)}`}
        </span>
      </span>
    </div>
  )
}

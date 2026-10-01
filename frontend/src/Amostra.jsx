import { montarTabela } from './regrasTabela'

/*
 * Trecho real do cartão de ponto de exemplo (time-card-01), passado pelas
 * mesmas regras da tela de revisão: os destaques abaixo não são desenhados à
 * mão, saem do regrasTabela.js. O 31/10 foi tirado de propósito, pra que o
 * aviso de sequência apareça junto com o de batida ímpar.
 */
const TRECHO = {
  pages: [
    {
      page: 1,
      days: [
        dia('29/10/2012', '09:23'),
        dia('30/10/2012', '09:12', '13:55', '14:58', '19:01'),
        dia('01/11/2012', '09:26', '13:45', '15:08', '19:21'),
        dia('02/11/2012'),
      ],
    },
  ],
}

function dia(data, ...horarios) {
  return {
    date_raw: data,
    punches: horarios.map((horario, i) => ({
      kind: i % 2 === 0 ? 'IN' : 'OUT',
      time_raw: horario,
      time_hhmm: horario,
    })),
  }
}

function Amostra() {
  const { colunas, linhas } = montarTabela('cartao-ponto', TRECHO)

  return (
    <div className="rolagem amostra" role="group" aria-label="Exemplo de tabela revisada">
      <table className="tabela estatica">
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna} scope="col">
                {coluna}
              </th>
            ))}
            <th scope="col" className="coluna-aviso">
              Aviso
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.chave} className={linha.destaque ?? undefined}>
              {linha.celulas.map((celula, i) => (
                <td key={colunas[i]}>
                  <span className="celula">{celula}</span>
                </td>
              ))}
              <td className="coluna-aviso">{linha.motivos.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Amostra

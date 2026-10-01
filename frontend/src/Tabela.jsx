import { contarDestaques, editarCelula, montarTabela } from './regrasTabela'

/*
 * Tabela editável. Não guarda estado: monta as linhas a partir do value a
 * cada render e devolve um value novo pelo aoEditar. Assim a transcrição em
 * memória continua sendo a única fonte da verdade, e os avisos são sempre
 * derivados do que está na tela naquele momento.
 */
function Tabela({ tipo, value, aoEditar }) {
  const tabela = montarTabela(tipo, value)
  const { colunas, linhas } = tabela
  const destaques = contarDestaques(linhas)

  function mudar(linha, indiceColuna, novoValor) {
    aoEditar(editarCelula(tipo, value, tabela, linha, indiceColuna, novoValor))
  }

  return (
    <div className="area tabela-area">
      <div className="area-topo">
        <span className="area-titulo">
          {linhas.length} {linhas.length === 1 ? 'linha' : 'linhas'}
          <span className="area-sub"> em {colunas.length} colunas</span>
        </span>

        <span className="etiquetas">
          {destaques.vermelho > 0 && (
            <span className="etiqueta vermelho">
              {destaques.vermelho} fora de sequência
            </span>
          )}

          {destaques.amarelo > 0 && (
            <span className="etiqueta amarelo">{destaques.amarelo} a conferir</span>
          )}

          {destaques.vermelho === 0 && destaques.amarelo === 0 && (
            <span className="etiqueta ok">Nenhum aviso</span>
          )}
        </span>
      </div>

      <div className="rolagem">
        <table className="tabela">
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
                {linha.celulas.map((celula, indiceColuna) => (
                  <td key={colunas[indiceColuna]}>
                    <input
                      value={celula}
                      /*
                       * A largura sai do conteúdo. Sem isso todo input nasce
                       * com ~20 caracteres e cada coluna fica com 230px pra
                       * guardar um "09:04"; com piso fixo, a data corta no
                       * celular. A coluna fica com a maior célula dela.
                       */
                      size={1}
                      style={{ '--caracteres': Math.max(5, String(celula).length) }}
                      // A célula diz o que é e de qual linha, pra quem navega
                      // por teclado ou leitor de tela não se perder.
                      aria-label={`${colunas[indiceColuna]}, linha ${linha.celulas[0]}`}
                      onChange={(evento) =>
                        mudar(linha, indiceColuna, evento.target.value)
                      }
                    />
                  </td>
                ))}

                {/*
                  A cor sozinha não comunica: quem não distingue as cores, ou
                  usa leitor de tela, precisa do motivo escrito.
                */}
                <td className="coluna-aviso">{linha.motivos.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Tabela

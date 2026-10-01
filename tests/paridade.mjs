/*
 * Lado da tela do teste de paridade: recebe pela entrada padrão uma lista de
 * { tipo, value }, monta a tabela com as mesmas regras que o frontend usa e
 * devolve colunas, células e destaque de cada linha em JSON.
 *
 * Chamado pelo tests/test_paridade.py, que compara com o backend/planilha.py.
 */
import { readFileSync } from 'node:fs'

import { montarTabela } from '../frontend/src/regrasTabela.js'

const casos = JSON.parse(readFileSync(0, 'utf-8'))

const tabelas = casos.map(({ tipo, value }) => {
  const { colunas, linhas } = montarTabela(tipo, value)
  return {
    colunas,
    linhas: linhas.map(({ celulas, destaque }) => ({ celulas, destaque })),
  }
})

process.stdout.write(JSON.stringify(tabelas))

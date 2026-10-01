import { Clock, Receipt } from '@phosphor-icons/react'

// Os dois tipos que o backend aceita, com o que a tela mostra de cada um.
export const TIPOS = [
  {
    valor: 'cartao-ponto',
    rotulo: 'Cartão de ponto',
    dica: 'Batidas por dia',
    Icone: Clock,
  },
  {
    valor: 'holerite',
    rotulo: 'Holerite',
    dica: 'Verbas por mês',
    Icone: Receipt,
  },
]

export function rotuloDoTipo(valor) {
  return TIPOS.find((tipo) => tipo.valor === valor)?.rotulo ?? valor
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(valor));
}

module.exports = { formatarMoeda };

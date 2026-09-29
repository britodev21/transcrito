# Documentos de exemplo

PDFs usados para desenvolver e validar os extratores. São documentos reais,
com os dados pessoais substituídos, e não são de minha autoria: vieram junto
com a especificação que deu origem ao projeto.

```
exemplos/
├── time-card-01.pdf   cartão de ponto, texto nativo
├── time-card-02.pdf   cartão de ponto, escaneado (OCR)
├── time-card-03.pdf   cartão de ponto, escaneado (OCR)
├── time-card-04.pdf   cartão de ponto, foto (OCR)
├── payroll-01.pdf     ficha financeira, texto nativo
├── payroll-02.pdf     holerite, texto nativo
├── payroll-03.pdf     holerite, texto nativo
└── payroll-04.pdf     holerite, escaneado (OCR)
```

As planilhas geradas a partir deles ficam em [`saidas/`](../saidas), e
`python gerar_saidas.py`, na raiz, refaz todas de uma vez.

Nem todos os layouts são lidos. A situação de cada arquivo está no
[README](../README.md#documentos-suportados).

São uma amostra, não uma especificação: um documento de layout diferente
destes pode não ser reconhecido.

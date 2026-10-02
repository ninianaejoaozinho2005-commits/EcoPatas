/* ==========================================================================
   EcoPatas - BASE DE PONTOS DE COLETA
   --------------------------------------------------------------------------
   ATENCAO: os registros abaixo sao EXEMPLOS FICTICIOS ("dados de demonstracao").
   Nomes de estabelecimentos, enderecos e coordenadas foram inventados apenas
   para validar a experiencia da tela. Substitua por dados reais antes de
   publicar o site.

   COMO CADASTRAR UM PONTO REAL
   ----------------------------
   Cada item da lista precisa destes campos:

     id          string unica (ex.: "sp-centro-01")
     nome        nome do estabelecimento
     tipo        "ONG" | "Pet shop" | "Clinica veterinaria" | "Ecoponto" | "Condominio"
     endereco    rua e numero
     bairro      bairro
     cidade      cidade
     uf          sigla de 2 letras
     cep         CEP do ponto (com ou sem traco)
     telefone    telefone/WhatsApp para contato (opcional)
     horario     texto livre de horario de funcionamento
     materiais   lista de materiais aceitos (use os nomes de MATERIAIS abaixo)
     lat         latitude  (numero negativo no Brasil, ex.: -23.5505)
     lng         longitude (numero negativo no Brasil, ex.: -46.6333)
     obs         observacao curta (opcional)

   Para descobrir lat/lng de um endereco:
   - abra https://www.openstreetmap.org, clique com o botao direito no local
     e escolha "Mostrar endereco" / copie as coordenadas; ou
   - use o site https://nominatim.openstreetmap.org/search

   Os materiais precisam existir na lista MATERIAIS, pois ela alimenta os
   filtros da tela. Se precisar de um material novo, acrescente-o la e em
   pelo menos um ponto.
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIGURACOES GERAIS DO SITE
   -------------------------------------------------------------------------- */
window.ECOPATAS_CONFIG = {
  /* Marca exibida no titulo do card principal */
  marca: 'EcoPatas',

  /* E-mail de contato do botao "Quero cadastrar um ponto".
     Placeholder - troque pelo e-mail real do projeto. */
  contatoEmail: 'contato@exemplo.com.br',

  /* Distancia maxima (km, em linha reta) para ainda considerar um ponto.
     Pontos mais distantes que isso entram na lista como "fora do raio". */
  raioKm: 60,

  /* Quantos pontos exibir no mapa e na lista (do mais proximo ao mais distante) */
  limitePontos: 8,

  /* Raio (em metros) da area de incerteza desenhada em volta do CEP.
     O CEP nao aponta uma casa, e sim uma faixa de ruas. */
  raioIncertezaCepMetros: 700,

  /* Servicos publicos usados na busca por CEP (nao exigem chave de API) */
  apiBrasilApi: 'https://brasilapi.com.br/api/cep/v2/',
  apiViaCep: 'https://viacep.com.br/ws/',
  apiNominatim: 'https://nominatim.openstreetmap.org/',

  /* E-mail de contato exigido pela politica de uso do Nominatim (OSM).
     Troque por um e-mail valido do projeto para uso em producao. */
  contatoTecnico: 'contato@exemplo.com.br',

  /* Exibe a tarja de "dados de demonstracao" no site */
  modoDemonstracao: true
};

/* --------------------------------------------------------------------------
   MATERIAIS ACEITOS (alimenta os filtros e os icones da lista)
   -------------------------------------------------------------------------- */
window.ECOPATAS_MATERIAIS = [
  { id: 'medicamentos', rotulo: 'Medicamentos vencidos', icone: '💊' },
  { id: 'racao', rotulo: 'Ração e petiscos', icone: '🥣' },
  { id: 'pilhas', rotulo: 'Pilhas e baterias', icone: '🔋' },
  { id: 'oleo', rotulo: 'Óleo de cozinha usado', icone: '🛢️' },
  { id: 'eletronicos', rotulo: 'Eletrônicos e cabos', icone: '🔌' },
  { id: 'roupas', rotulo: 'Roupas e tecidos', icone: '👕' },
  { id: 'embalagens', rotulo: 'Embalagens e plásticos', icone: '♻️' },
  { id: 'vidro', rotulo: 'Vidros', icone: '🍾' },
  { id: 'vacinas', rotulo: 'Frascos de vacina', icone: '💉' },
  { id: 'higiene', rotulo: 'Itens de higiene', icone: '🧼' }
];

/* --------------------------------------------------------------------------
   PONTOS DE COLETA (base que o site consome)
   -------------------------------------------------------------------------- */
window.ECOPATAS_PONTOS = [
  {
    id: 'ex-centro-01',
    nome: 'Espaço Amigo Animal (exemplo)',
    tipo: 'ONG',
    endereco: 'Rua das Acácias, 120',
    bairro: 'Centro (exemplo)',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01001-000',
    telefone: '(00) 0000-0000',
    horario: 'Seg a sex, 9h às 18h | Sáb, 9h às 13h',
    materiais: ['medicamentos', 'racao', 'higiene'],
    lat: -23.5505,
    lng: -46.6333,
    obs: 'Exemplo — unidade de referência no centro.'
  },
  {
    id: 'ex-paulista-02',
    nome: 'Casa do Bicho Feliz (exemplo)',
    tipo: 'Pet shop',
    endereco: 'Avenida do Contorno, 245',
    bairro: 'Bela Vista (exemplo)',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01310-100',
    telefone: '(00) 0000-0001',
    horario: 'Seg a sáb, 10h às 19h',
    materiais: ['racao', 'medicamentos', 'embalagens'],
    lat: -23.5614,
    lng: -46.6559,
    obs: 'Exemplo — maior volume de ração e petiscos.'
  },
  {
    id: 'ex-santacecilia-03',
    nome: 'Clínica Vida Pet (exemplo)',
    tipo: 'Clínica veterinária',
    endereco: 'Rua do Bosque, 88',
    bairro: 'Santa Cecília (exemplo)',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01227-000',
    telefone: '(00) 0000-0002',
    horario: 'Seg a sex, 8h às 20h',
    materiais: ['medicamentos', 'vacinas', 'higiene'],
    lat: -23.5329,
    lng: -46.6395,
    obs: 'Exemplo — recebe frascos de vacina e medicamentos vencidos.'
  },
  {
    id: 'ex-vilamariana-04',
    nome: 'Núcleo Verde Patinhas (exemplo)',
    tipo: 'ONG',
    endereco: 'Rua das Figueiras, 310',
    bairro: 'Vila Mariana (exemplo)',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '04012-000',
    telefone: '(00) 0000-0003',
    horario: 'Terça a domingo, 10h às 17h',
    materiais: ['roupas', 'embalagens', 'vidro', 'eletronicos'],
    lat: -23.5893,
    lng: -46.6585,
    obs: 'Exemplo — feira de adoção nos fins de semana.'
  },
  {
    id: 'ex-pinheiros-05',
    nome: 'Ecoponto Comunidade Ativa (exemplo)',
    tipo: 'Ecoponto',
    endereco: 'Rua dos Pinheiros, 1000',
    bairro: 'Pinheiros (exemplo)',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '05422-000',
    telefone: '(00) 0000-0004',
    horario: 'Todos os dias, 7h às 22h',
    materiais: ['oleo', 'pilhas', 'eletronicos', 'vidro', 'embalagens'],
    lat: -23.5640,
    lng: -46.6900,
    obs: 'Exemplo — ponto com coleta de óleo de cozinha usado.'
  },
  {
    id: 'ex-saude-06',
    nome: 'Cantinho do Bem-Estar Pet (exemplo)',
    tipo: 'Pet shop',
    endereco: 'Avenida das Palmeiras, 570',
    bairro: 'Saúde (exemplo)',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '04053-000',
    telefone: '(00) 0000-0005',
    horario: 'Seg a sáb, 9h às 18h',
    materiais: ['racao', 'higiene', 'embalagens'],
    lat: -23.6290,
    lng: -46.6490,
    obs: 'Exemplo — aceita doação de ração aberta.'
  },
  {
    id: 'ex-santoandre-07',
    nome: 'Instituto Quatro Patas (exemplo)',
    tipo: 'ONG',
    endereco: 'Rua do Ipiranga, 45',
    bairro: 'Centro (exemplo)',
    cidade: 'Santo André',
    uf: 'SP',
    cep: '09010-000',
    telefone: '(00) 0000-0006',
    horario: 'Seg a sex, 9h às 17h',
    materiais: ['medicamentos', 'racao', 'roupas'],
    lat: -23.6639,
    lng: -46.5310,
    obs: 'Exemplo — atende também protetores independentes.'
  },
  {
    id: 'ex-saobernardo-08',
    nome: 'Pet Shop Bichos e Cia (exemplo)',
    tipo: 'Pet shop',
    endereco: 'Avenida das Nações, 210',
    bairro: 'Jardim (exemplo)',
    cidade: 'São Bernardo do Campo',
    uf: 'SP',
    cep: '09710-000',
    telefone: '(00) 0000-0007',
    horario: 'Seg a sáb, 8h30 às 19h',
    materiais: ['pilhas', 'embalagens', 'racao'],
    lat: -23.6820,
    lng: -46.5620,
    obs: 'Exemplo — caixa coletora de pilhas na entrada.'
  },
  {
    id: 'ex-guarulhos-09',
    nome: 'Condomínio Bosque Verde (exemplo)',
    tipo: 'Condomínio',
    endereco: 'Alameda dos Sábias, 75',
    bairro: 'Centro (exemplo)',
    cidade: 'Guarulhos',
    uf: 'SP',
    cep: '07010-000',
    telefone: '(00) 0000-0008',
    horario: 'Portaria 24h',
    materiais: ['oleo', 'roupas', 'eletronicos', 'embalagens'],
    lat: -23.4538,
    lng: -46.5333,
    obs: 'Exemplo — ponto restrito a moradores e visitantes.'
  },
  {
    id: 'ex-republica-10',
    nome: 'Veterinária Amigo Fiel (exemplo)',
    tipo: 'Clínica veterinária',
    endereco: 'Praça da Harmonia, 12',
    bairro: 'República (exemplo)',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01045-000',
    telefone: '(00) 0000-0009',
    horario: 'Seg a sex, 8h às 19h | Sáb, 8h às 12h',
    materiais: ['medicamentos', 'vacinas', 'higiene', 'pilhas'],
    lat: -23.5489,
    lng: -46.6388,
    obs: 'Exemplo — descarte de medicamentos com triagem na recepção.'
  }
];


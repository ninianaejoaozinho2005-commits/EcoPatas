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
  limitePontos: 14,

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
// Lista oficial dos itens que a EcoPatas recebe. Este arquivo vem DEPOIS do pontos.js no HTML, então esta lista vence a antiga.
window.ECOPATAS_MATERIAIS = [ // abre a lista; o app.js lê esta variável para montar filtros, etiquetas e a seção Impacto
  // ---- ITENS EM DESTAQUE (cerca de 90% das entregas): destaque: true ----
  { id: 'tampinhas', rotulo: 'Tampinhas plásticas', icone: '🧴', destaque: true }, // mantém o id "tampinhas" para os pontos que já usam esse id
  { id: 'lacres', rotulo: 'Lacres de alumínio', icone: '🥫', destaque: true }, // lata de alumínio representa os lacres
  { id: 'nota-fiscal', rotulo: 'Nota Fiscal Paulista (sem CPF)', icone: '🧾', destaque: true }, // recibo representa a nota fiscal
  // ---- DEMAIS ITENS (sem destaque) ----
  { id: 'racao', rotulo: 'Ração (cães e gatos)', icone: '🦴', destaque: false }, // osso representa a ração
  { id: 'casinhas', rotulo: 'Casinhas', icone: '🏠', destaque: false }, // casinha para os animais
  { id: 'camas', rotulo: 'Camas para animais', icone: '🛏️', destaque: false }, // cama
  { id: 'cobertores', rotulo: 'Cobertores para animais', icone: '🧶', destaque: false }, // novelo representa o cobertor
  { id: 'coleiras', rotulo: 'Coleiras e guias', icone: '🦮', destaque: false }, // cão-guia com guia
  { id: 'caixas-transporte', rotulo: 'Caixas de transporte de animais', icone: '🧳', destaque: false }, // caixa/mala de transporte
  { id: 'vasilhas', rotulo: 'Vasilhas', icone: '🥣', destaque: false } // tigela para ração e água
]; // fecha a lista

/* --------------------------------------------------------------------------
   PONTOS DE COLETA (base que o site consome)
   -------------------------------------------------------------------------- */
// EcoPatas — pontos de coleta de tampinhas.
// ATENÇÃO: lat/lng são APROXIMADAS (centro do bairro/cidade). Troque pelas coordenadas
// exatas de cada endereço (clique com o botão direito no Google Maps > copiar coordenadas).
window.ECOPATAS_PONTOS = [

  /* ===================== SÃO PAULO — CENTRO ===================== */
  { id: 'sp-aclimacao-costelao-do-boni', nome: 'Costelão do Boni', endereco: 'Rua Brás Cubas, 344', bairro: 'Aclimação', cidade: 'São Paulo', uf: 'SP', horario: 'Ter. a dom., 11h às 22h', materiais: ['tampinhas'], lat: -23.5710, lng: -46.6270, obs: '' },
  { id: 'sp-bela-vista-playeasy', nome: 'Playeasy', endereco: 'Rua Pedro Taques, 47', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sáb., 12h às 19h', materiais: ['tampinhas'], lat: -23.5590, lng: -46.6460, obs: '' },
  { id: 'sp-consolacao-shopping-frei-caneca', nome: 'Shopping Frei Caneca', endereco: 'Rua Frei Caneca, 569', bairro: 'Consolação', cidade: 'São Paulo', uf: 'SP', horario: 'Diariamente, durante o horário de funcionamento do shopping', materiais: ['tampinhas'], lat: -23.5535, lng: -46.6520, obs: 'Levar somente pequenas quantidades e não deixar sacolas ao lado do coletor.' },
  { id: 'sp-liberdade-angry-cat-coffee-shop', nome: 'Angry Cat Coffee Shop', endereco: 'Rua Galvão Bueno, 387', bairro: 'Liberdade', cidade: 'São Paulo', uf: 'SP', horario: 'Ter. a dom., 11h às 18h', materiais: ['tampinhas'], lat: -23.5590, lng: -46.6350, obs: '' },
  { id: 'sp-higienopolis-kahu', nome: 'Kahu - O Lar do seu Pet', endereco: 'Rua Dr. Gabriel dos Santos, 55', bairro: 'Higienópolis', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 8h às 19h | Sáb., 9h às 17h', materiais: ['tampinhas'], lat: -23.5420, lng: -46.6560, obs: '' },
  { id: 'sp-se-instituto-edison', nome: 'Instituto Edison', endereco: 'Rua Tabatinguera, 122', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 8h às 22h', materiais: ['tampinhas'], lat: -23.5517, lng: -46.6329, obs: '' },

  /* ===================== SÃO PAULO — ZONA SUL ===================== */
  { id: 'sp-cambuci-pet-vet-cia', nome: 'Pet Vet & Cia Animal Center', endereco: 'Av. Lacerda Franco, 92', bairro: 'Cambuci', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sáb., 8h às 18h', materiais: ['tampinhas'], lat: -23.5680, lng: -46.6180, obs: '' },
  { id: 'sp-campo-limpo-shopping', nome: 'Shopping Campo Limpo (praça de alimentação)', endereco: 'Estrada do Campo Limpo, 459', bairro: 'Campo Limpo', cidade: 'São Paulo', uf: 'SP', horario: 'Diariamente, durante o horário de funcionamento do shopping', materiais: ['tampinhas'], lat: -23.6460, lng: -46.7580, obs: 'Levar somente pequenas quantidades e não deixar sacolas ao lado do coletor.' },
  { id: 'sp-chacara-santo-antonio-staypet', nome: 'StayPet', endereco: 'Rua Francisco de Morais, 328', bairro: 'Chácara Santo Antônio', cidade: 'São Paulo', uf: 'SP', horario: 'Somente às terças-feiras', materiais: ['tampinhas'], lat: -23.6330, lng: -46.7090, obs: 'Recebimento apenas às terças-feiras. Limite de 1 saco de tampinha por pessoa.' },
  { id: 'sp-indianopolis-vet-medicina-veterinaria-avancada', nome: 'VET - Medicina Veterinária Avançada', endereco: 'Av. Indianópolis, 1788', bairro: 'Indianópolis', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sáb., 7h às 16h30', materiais: ['tampinhas'], lat: -23.6000, lng: -46.6600, obs: 'Limite de 1 saco de tampinha por pessoa.' },
  { id: 'sp-jardim-da-saude-shopping-plaza-sul', nome: 'Shopping Plaza Sul (praça de alimentação P2)', endereco: 'Praça Leonor Kaupa, 100', bairro: 'Jardim da Saúde', cidade: 'São Paulo', uf: 'SP', horario: 'Diariamente, durante o horário de funcionamento do shopping', materiais: ['tampinhas'], lat: -23.6170, lng: -46.6120, obs: 'Levar somente pequenas quantidades e não deixar sacolas ao lado do coletor.' },
  { id: 'sp-mirandopolis-clinica-rua-das-rosas', nome: 'Clínica Veterinária Rua das Rosas', endereco: 'Rua das Rosas, 582', bairro: 'Mirandópolis', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 10h às 18h', materiais: ['tampinhas'], lat: -23.6140, lng: -46.6420, obs: '' },
  { id: 'sp-santo-amaro-clinica-vet-care-help', nome: 'Clínica Vet Care Help', endereco: 'Rua Coronel Luis Barroso, 106', bairro: 'Santo Amaro', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sáb., 10h30 às 18h', materiais: ['tampinhas'], lat: -23.6540, lng: -46.7090, obs: '' },
  { id: 'sp-vila-mariana-hospedaria-de-caes', nome: 'Hospedaria de Cães', endereco: 'Rua Artur de Almeida, 175', bairro: 'Vila Mariana', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 7h às 18h | Sáb., 8h às 17h', materiais: ['tampinhas'], lat: -23.5890, lng: -46.6350, obs: '' },
  { id: 'sp-vila-santa-catarina-centro-fenix', nome: 'Centro de Promoção Social Fênix', endereco: 'Rua Alberto Sampaio, 430', bairro: 'Vila Santa Catarina', cidade: 'São Paulo', uf: 'SP', horario: 'Ter. a sex., 9h às 18h', materiais: ['tampinhas'], lat: -23.6370, lng: -46.6470, obs: '' },

  /* ===================== SÃO PAULO — ZONA OESTE ===================== */
  { id: 'sp-barra-funda-instituto-oswaldo-quirino', nome: 'Instituto Educacional Oswaldo Quirino', endereco: 'Rua Brigadeiro Galvão, 540', bairro: 'Barra Funda', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 8h às 20h', materiais: ['tampinhas'], lat: -23.5270, lng: -46.6650, obs: '' },
  { id: 'sp-pinheiros-restaurante-estela-passoni', nome: 'Restaurante Estela Passoni', endereco: 'Rua Joaquim Antunes, 621', bairro: 'Pinheiros', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 9h às 17h | Sáb., 9h às 14h', materiais: ['tampinhas'], lat: -23.5670, lng: -46.6920, obs: '' },
  { id: 'sp-pinheiros-loja-novidario', nome: 'Loja Novidário', endereco: 'Rua Costa Carvalho, 113', bairro: 'Pinheiros', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 10h às 18h', materiais: ['tampinhas'], lat: -23.5670, lng: -46.6920, obs: 'Comercializa objetos feitos com tampinhas e outros recicláveis.' },
  { id: 'sp-pinheiros-crie-camisetas-online', nome: 'Crie Camisetas Online', endereco: 'Rua Inácio Pereira da Rocha, 399', bairro: 'Pinheiros', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 8h às 17h30 | Sáb., 8h às 11h30', materiais: ['tampinhas'], lat: -23.5670, lng: -46.6920, obs: '' },
  { id: 'sp-vila-madalena-casa-de-cultura-os-capoeira', nome: 'Casa de Cultura Os Capoeira', endereco: 'Rua Belmiro Braga, 186', bairro: 'Vila Madalena', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a qui., 17h às 22h | Sáb., 11h às 15h', materiais: ['tampinhas'], lat: -23.5530, lng: -46.6910, obs: '' },
  { id: 'sp-vila-madalena-uniformeasy', nome: 'UniformEasy', endereco: 'Rua Fradique Coutinho, 1171', bairro: 'Vila Madalena', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 9h30 às 17h30 | Sáb., 9h30 às 13h30', materiais: ['tampinhas'], lat: -23.5530, lng: -46.6910, obs: '' },

  /* ===================== SÃO PAULO — ZONA NORTE ===================== */
  { id: 'sp-caninde-shopping-d', nome: 'Shopping D', endereco: 'Avenida Cruzeiro do Sul, 1100', bairro: 'Canindé', cidade: 'São Paulo', uf: 'SP', horario: 'Horário de funcionamento do shopping', materiais: ['tampinhas'], lat: -23.5170, lng: -46.6240, obs: 'Piso 1: em frente ao Cruzeiro\'s Bar e à Smart Case. Piso 2: em frente à Casa das Alianças. Somente pequenas quantidades e não deixar sacolas ao lado dos coletores.' },
  { id: 'sp-casa-verde-disk-agua', nome: 'Disk Água Casa Verde', endereco: 'Rua Carandaí, 51', bairro: 'Casa Verde', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 10h às 14h', materiais: ['tampinhas'], lat: -23.5100, lng: -46.6590, obs: '' },
  { id: 'sp-imirim-patinhas-urbanas', nome: 'Patinhas Urbanas', endereco: 'Rua Jorge Valim, 351', bairro: 'Imirim', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 10h às 16h', materiais: ['tampinhas'], lat: -23.4930, lng: -46.6500, obs: '' },
  { id: 'sp-jardim-japao-mercadao-pet-vila-maria', nome: 'Mercadão Pet Vila Maria', endereco: 'Rua Casa da Moeda, 46', bairro: 'Jd. Japão', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 8h30 às 20h | Sáb., 9h às 18h', materiais: ['tampinhas'], lat: -23.4960, lng: -46.5890, obs: '' },
  { id: 'sp-jardim-pirituba-cantareira-norte-shopping', nome: 'Cantareira Norte Shopping', endereco: 'Av. Raimundo Pereira de Magalhães, 11001', bairro: 'Jd. Pirituba', cidade: 'São Paulo', uf: 'SP', horario: 'Diariamente, durante o horário de funcionamento do shopping', materiais: ['tampinhas'], lat: -23.4780, lng: -46.7290, obs: 'Não levar grandes quantidades nem deixar sacolas ao lado do coletor.' },
  { id: 'sp-parada-inglesa-perpetuare-pet', nome: 'Perpetuare Pet', endereco: 'Rua Vinte e Quatro de Dezembro, 108', bairro: 'Parada Inglesa', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sáb., 9h às 17h', materiais: ['tampinhas'], lat: -23.4800, lng: -46.6030, obs: '' },
  { id: 'sp-santana-coisa-boa-comidinhas-da-dona-re', nome: 'Coisa Boa! Comidinhas da Dona Rê', endereco: 'Rua Dr. Zuquim, 1460', bairro: 'Santana', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 7h30 às 18h | Sáb., 9h às 15h', materiais: ['tampinhas'], lat: -23.5010, lng: -46.6270, obs: '' },
  { id: 'sp-tremembe-studio-gi-santos', nome: 'Studio Gi Santos', endereco: 'Rua Mamudh Radh, 158', bairro: 'Tremembé', cidade: 'São Paulo', uf: 'SP', horario: 'Ter. a sáb., 10h às 18h', materiais: ['tampinhas'], lat: -23.4620, lng: -46.6060, obs: '' },
  { id: 'sp-vila-maria-clinica-veterinaria-vila-maria', nome: 'Clínica Veterinária Vila Maria', endereco: 'Rua Araritaguaba, 1004', bairro: 'Vila Maria', cidade: 'São Paulo', uf: 'SP', horario: 'Seg. a sex., 10h às 17h | Sáb., 10h às 13h', materiais: ['tampinhas'], lat: -23.5130, lng: -46.5870, obs: '' },

  /* ===================== GUARULHOS ===================== */
  { id: 'guarulhos-itapegica-internacional-shopping', nome: 'Internacional Shopping (praça de alimentação)', endereco: 'Rod. Presidente Dutra, Saída 225', bairro: 'Itapegica', cidade: 'Guarulhos', uf: 'SP', horario: 'Diariamente, durante o horário de funcionamento do shopping', materiais: ['tampinhas'], lat: -23.4490, lng: -46.5330, obs: 'Levar somente pequenas quantidades e não deixar sacolas ao lado do coletor.' },
  { id: 'guarulhos-ponte-grande-centro-vet', nome: 'Centro Vet. Ponte Grande', endereco: 'Av. Guarulhos, 4.173', bairro: 'Ponte Grande', cidade: 'Guarulhos', uf: 'SP', horario: 'Seg. a sáb., 8h às 18h', materiais: ['tampinhas'], lat: -23.4720, lng: -46.5260, obs: '' },
  { id: 'guarulhos-ponte-grande-correios', nome: 'Correios', endereco: 'Av. Guarulhos, 4130', bairro: 'Ponte Grande', cidade: 'Guarulhos', uf: 'SP', horario: 'Seg. a sex., 10h às 16h', materiais: ['tampinhas'], lat: -23.4720, lng: -46.5260, obs: '' },
  { id: 'guarulhos-vila-das-palmeiras-asa-clinica', nome: 'ASA Clínica Veterinária', endereco: 'Rua Dona Antônia, 1098', bairro: 'Vila das Palmeiras', cidade: 'Guarulhos', uf: 'SP', horario: 'Ter. a qui., 10h às 18h', materiais: ['tampinhas'], lat: -23.4560, lng: -46.5420, obs: '' },

  /* ===================== GRANDE SÃO PAULO ===================== */
  { id: 'aruja-mutts-clinica-vet', nome: 'Mutts - Clínica Vet. e Estética Animal', endereco: 'Rua Santo Antonio, 970', bairro: 'Nova Arujá', cidade: 'Arujá', uf: 'SP', horario: 'Seg. a sex., 8h às 17h | Sáb., 8h às 12h', materiais: ['tampinhas'], lat: -23.3960, lng: -46.3200, obs: '' },
  { id: 'barueri-bar-baixo-alpha', nome: 'Bar Baixo Alpha', endereco: 'Alameda Rio Negro, 229 (dentro do Posto BR)', bairro: 'Alphaville', cidade: 'Barueri', uf: 'SP', horario: 'Todos os dias, 7h às 22h', materiais: ['tampinhas'], lat: -23.5000, lng: -46.8470, obs: '' },
  { id: 'barueri-gabichos-zen-cia', nome: 'Gabichos Zen & Cia', endereco: 'Alameda Araguaia, 272 - Loja 4', bairro: 'Alphaville', cidade: 'Barueri', uf: 'SP', horario: 'Seg. a sex., 7h às 20h | Sáb., 9h às 19h', materiais: ['tampinhas'], lat: -23.5000, lng: -46.8470, obs: '' },
  { id: 'cajamar-pet-cao', nome: 'Pet Cão', endereco: 'Avenida das Palmeiras, 607', bairro: 'Portal dos Ipês', cidade: 'Cajamar', uf: 'SP', horario: 'Ter. a sáb., 9h às 18h', materiais: ['tampinhas'], lat: -23.3550, lng: -46.8780, obs: '' },
  { id: 'campo-limpo-paulista-vetfarmaco', nome: 'VETFARMACO', endereco: 'Rua Sétimo Patelli, 123', bairro: 'Vila Thomazina', cidade: 'Campo Limpo Paulista', uf: 'SP', horario: 'Seg. a sex., 9h às 17h', materiais: ['tampinhas'], lat: -23.2070, lng: -46.7880, obs: '' },
  { id: 'embu-das-artes-cia-opa', nome: 'Cia Opa', endereco: 'Rua Iva, 100', bairro: 'Jd. Santo Eduardo', cidade: 'Embu das Artes', uf: 'SP', horario: 'Seg. a sex., 9h às 16h', materiais: ['tampinhas'], lat: -23.6490, lng: -46.8520, obs: '' },
  { id: 'itaquaquecetuba-veterinaria-california', nome: 'Veterinária Califórnia', endereco: 'Estrada Pedro da Cunha Albuquerque Lopes, 2484', bairro: 'Jd. Silvestre', cidade: 'Itaquaquecetuba', uf: 'SP', horario: 'Seg. a sex., 8h às 18h | Sáb., 8h às 15h', materiais: ['tampinhas'], lat: -23.4860, lng: -46.3480, obs: '' },
  { id: 'maua-clinica-vet-popular-sos-pet', nome: 'Clínica Vet. Popular SOS Pet', endereco: 'Rua Canadá, 76', bairro: 'Parque das Américas', cidade: 'Mauá', uf: 'SP', horario: 'Seg. a sex., 13h às 17h', materiais: ['tampinhas'], lat: -23.6670, lng: -46.4610, obs: '' },
  { id: 'osasco-st-flex-borrachas-e-metais', nome: 'ST Flex Borrachas e Metais', endereco: 'Avenida Santo Antonio, 408', bairro: 'Vila Osasco', cidade: 'Osasco', uf: 'SP', horario: 'Seg. a sex., 8h às 17h | Sáb., 8h às 13h', materiais: ['tampinhas'], lat: -23.5320, lng: -46.7920, obs: '' },
  { id: 'osasco-banca-padroeira-do-brasil', nome: 'Banca Padroeira do Brasil', endereco: 'Praça Padroeira do Brasil, 204', bairro: 'Jd. Agú', cidade: 'Osasco', uf: 'SP', horario: 'Seg. a sex., 8h às 16h', materiais: ['tampinhas'], lat: -23.5130, lng: -46.7860, obs: '' },
  { id: 'santana-de-parnaiba-petland-alphaville', nome: 'Petland Alphaville', endereco: 'Av. Yojiro Takaoka, 4700', bairro: 'Alphaville', cidade: 'Santana de Parnaíba', uf: 'SP', horario: 'Seg. a sáb., 8h às 18h', materiais: ['tampinhas'], lat: -23.4880, lng: -46.8380, obs: '' },
  { id: 'santana-de-parnaiba-pinkao-pet-center', nome: 'Pinkão Pet Center', endereco: 'Av. Marcos Penteado Ulhoa Rodrigues, 4053, loja 2', bairro: 'Tamboré', cidade: 'Santana de Parnaíba', uf: 'SP', horario: 'Seg. a sex., 9h às 17h | Sáb., 9h às 14h', materiais: ['tampinhas'], lat: -23.5040, lng: -46.8330, obs: '' },
  { id: 'taboao-da-serra-shopping-taboao', nome: 'Shopping Taboão', endereco: 'Rod. Regis Bittencourt, 2643', bairro: 'Jd. Helena', cidade: 'Taboão da Serra', uf: 'SP', horario: 'Seg. a sáb., 10h às 22h | Dom. e feriados, 14h às 20h', materiais: ['tampinhas'], lat: -23.6150, lng: -46.7770, obs: 'Somente pequenas quantidades que seja possível despejar no coletor. Não deixar sacolas ao lado do coletor.' },

  /* ===================== ABC PAULISTA ===================== */
  { id: 'diadema-shopping-praca-da-moca', nome: 'Shopping Praça da Moça', endereco: 'R. Manoel da Nóbrega, 712', bairro: 'Centro', cidade: 'Diadema', uf: 'SP', horario: 'Diariamente, durante o horário de funcionamento do shopping', materiais: ['tampinhas'], lat: -23.6860, lng: -46.6230, obs: 'Levar somente pequenas quantidades e não deixar sacolas ao lado do coletor.' },
  { id: 'santo-andre-cini', nome: 'CINI Centro Integrado de Neurologia Infantil', endereco: 'Rua Onze de Junho, 305', bairro: 'Casa Branca', cidade: 'Santo André', uf: 'SP', horario: 'Seg. a qui., 7h às 18h', materiais: ['tampinhas'], lat: -23.6900, lng: -46.5100, obs: '' },
  { id: 'sao-bernardo-golden-square-shopping', nome: 'Golden Square Shopping', endereco: 'Avenida Kennedy, 700', bairro: 'Jd. do Mar', cidade: 'São Bernardo do Campo', uf: 'SP', horario: 'Diariamente, durante o horário de funcionamento do shopping', materiais: ['tampinhas'], lat: -23.7120, lng: -46.5580, obs: 'Praças de alimentação. Levar somente pequenas quantidades e não deixar sacolas ao lado do coletor.' },
  { id: 'sao-bernardo-centro-espirita-seara-de-jesus', nome: 'Centro Espírita Seara de Jesus', endereco: 'Rua Votorantim, 415', bairro: 'Rudge Ramos', cidade: 'São Bernardo do Campo', uf: 'SP', horario: 'Seg., 20h às 22h | Qua., 14h às 18h | Sex., 18h às 22h | Sáb., 8h às 12h', materiais: ['tampinhas'], lat: -23.6600, lng: -46.5700, obs: '' },

  /* ===================== INTERIOR / LITORAL ===================== */
  { id: 'ilhabela-ilhabela-republic', nome: 'Ilhabela Republic', endereco: 'Av. Força Expedicionária Brasileira, 276', bairro: 'Santa Tereza', cidade: 'Ilhabela', uf: 'SP', horario: 'Qui. a ter., 9h às 18h', materiais: ['tampinhas'], lat: -23.7900, lng: -45.3620, obs: '' },
  { id: 'ilhabela-chales', nome: 'Ilhabela Chalés', endereco: 'Av. José Pachedo do Nascimento, 9994', bairro: 'São Pedro', cidade: 'Ilhabela', uf: 'SP', horario: 'Ter. a sex., 8h às 17h', materiais: ['tampinhas'], lat: -23.7950, lng: -45.4020, obs: '' }
];
/* ==========================================================================
   EcoPatas - logica da tela
   --------------------------------------------------------------------------
   Fluxo: CEP -> endereco + coordenadas aproximadas (BrasilAPI / ViaCEP +
   Nominatim) -> distancia em linha reta (Haversine) -> ponto mais proximo ->
   desenho no mapa (Leaflet) e lista ordenada.

   Todo o calculo acontece no navegador: nada e enviado para servidores do
   projeto, apenas consultas publicas de CEP e geocodificacao.
   ========================================================================== */
// Começa aqui uma "função que se executa sozinha" (em inglês, IIFE): tudo o que
// for criado dentro dela fica privado, sem vazar para o resto da página.
(function () {
  // Liga o "modo estrito": erros silenciosos (como usar variável não declarada) passam a dar erro.
  'use strict';

  // ------------------------------------------------------------------------
  // VALORES PADRÃO DE CONFIGURAÇÃO
  // ------------------------------------------------------------------------

  // Objeto com a configuração "de fábrica". Se você não definir algo em pontos.js, o valor daqui é usado.
  var PADRAO = {
    // Nome da marca, guardado para textos internos.
    marca: 'EcoPatas',
    // E-mail que recebe o contato do botão "Quero cadastrar um ponto" (endereço de exemplo: troque).
    contatoEmail: 'contato@exemplo.com.br',
    // E-mail técnico exigido pela política de uso do serviço Nominatim (OpenStreetMap).
    contatoTecnico: 'contato@exemplo.com.br',
    // Distância máxima, em quilômetros, para um ponto ainda ser considerado viável.
    raioKm: 60,
    // Quantos pontos aparecem na lista e no mapa, do mais perto ao mais longe.
    limitePontos: 8,
    // Tamanho, em metros, do círculo que representa a imprecisão do CEP informado.
    raioIncertezaCepMetros: 700,
    // BrasilAPI: devolve o endereço do CEP e, na maioria dos casos, também as coordenadas.
    apiBrasilApi: 'https://brasilapi.com.br/api/cep/v2/',
    // ViaCEP: o plano B. Devolve o endereço quando a BrasilAPI não responde.
    apiViaCep: 'https://viacep.com.br/ws/',
    // Nominatim: converte endereço em coordenadas e coordenadas em endereço.
    apiNominatim: 'https://nominatim.openstreetmap.org/',
    // Liga/desliga os avisos de "dados de demonstração" na tela.
    modoDemonstracao: true
  // Fecha o objeto PADRAO.
  };

  // Mescla três fontes de configuração: os valores PADRAO e depois o que você escreveu em pontos.js (o seu vence).
  var CFG = Object.assign({}, PADRAO, window.ECOPATAS_CONFIG || {});
  // Lê a lista de pontos de coleta de pontos.js; se ela não existir, vira lista vazia e o site não quebra.
  var PONTOS = Array.isArray(window.ECOPATAS_PONTOS) ? window.ECOPATAS_PONTOS : [];
  // Lê a lista de materiais aceitos (é ela que gera os filtros de material da tela).
  var MATERIAIS = Array.isArray(window.ECOPATAS_MATERIAIS) ? window.ECOPATAS_MATERIAIS : [];

  // Endereço dos "tiles" do mapa (os pedacinhos de imagem que formam o fundo).
  // Estilo claro do CARTO, que combina com o branco da marca. As chaves {s}, {z},
  // {x} e {y} são trocadas automaticamente pelo Leaflet (servidor, zoom e posição).
  var TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  // Crédito obrigatório de quem fornece os dados do mapa. Aparece no canto inferior do mapa.
  var ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // ------------------------------------------------------------------------
  // MAPA DO ESTADO DE SÃO PAULO (a "régua" do desenho feito no index.html)
  // ------------------------------------------------------------------------

  // O contorno do estado que aparece na página foi desenhado num sistema de
  // coordenadas próprio (o viewBox "0 0 640 429"). Os números abaixo são a
  // régua dessa projeção: eles transformam latitude/longitude reais em pontos
  // x/y dentro do desenho, para o pino laranja cair no lugar certo do mapa.
  var MAPA_ESTADO = {
    // Longitude do ponto mais a oeste de São Paulo (é o x = 0 do desenho).
    lonOeste: -53.1052,
    // Latitude do ponto mais ao norte de São Paulo (é o y = 0 do desenho).
    latNorte: -19.7862,
    // Quantos pixels do desenho vale um grau de longitude (já com a correção
    // do "achatamento" do planeta na latitude média do estado).
    escalaX: 71.59157,
    // Quantos pixels do desenho vale um grau de latitude.
    escalaY: 77.516831,
    // Tamanho do desenho, igual ao declarado no viewBox do index.html.
    largura: 640,
    altura: 429
  };

  // Converte latitude/longitude reais em um ponto x/y do desenho do estado.
  function pontoNoEstado(lat, lng) {
    return {
      // Quanto mais a leste (longitude maior), mais para a direita do desenho.
      x: (lng - MAPA_ESTADO.lonOeste) * MAPA_ESTADO.escalaX,
      // Quanto mais ao sul (latitude menor), mais para baixo do desenho.
      y: (MAPA_ESTADO.latNorte - lat) * MAPA_ESTADO.escalaY
    };
  }

  // Tira do endereço completo apenas o nome da cidade.
  // Ex.: "Praça da República, República, São Paulo - SP" devolve "São Paulo".
  function nomeDaCidade(endereco) {
    // Separa o endereço pelas vírgulas e percorre os pedaços de trás para
    // frente, porque a cidade costuma ser um dos últimos itens.
    var pedacos = (endereco || '').split(',');
    for (var i = pedacos.length - 1; i >= 0; i--) {
      // "São Paulo - SP" vira "São Paulo" (corta a sigla do estado).
      var parte = pedacos[i].split(' - ')[0].trim();
      // Ignora pedaços vazios, o "Brasil" do fim e siglas de 2 letras (UF).
      if (parte && parte.toLowerCase() !== 'brasil' && !/^[A-Z]{2}$/.test(parte)) {
        return parte;
      }
    }
    // Se nada com cara de cidade foi encontrado, devolve vazio (a tela usa um texto padrão).
    return '';
  }

  // ------------------------------------------------------------------------
  // ATALHOS PARA OS ELEMENTOS DA PÁGINA
  // ------------------------------------------------------------------------

  // Aqui guardamos "apelidos" para os pedaços do HTML que vamos manipular.
  // Em vez de escrever document.getElementById('campo-cep') toda hora, escrevemos el.input.
  var el = {
    // O formulário inteiro da busca (a caixa que envolve o campo e o botão).
    form: document.getElementById('form-cep'),
    // O campo de texto onde a pessoa digita o CEP.
    input: document.getElementById('campo-cep'),
    // A moldura arredondada em volta do campo: é ela que fica com a borda vermelha quando o CEP é inválido.
    campo: document.querySelector('.cep-field'),
    // A linha de texto que mostra mensagens ("Localizando...", "CEP não encontrado").
    feedback: document.getElementById('cep-feedback'),
    // O botão "Buscar ponto".
    btnBuscar: document.getElementById('btn-buscar'),
    // O botão "Usar minha localização atual".
    btnGeo: document.getElementById('btn-geo'),
    // A seção inteira de resultados (nasce escondida pelo atributo hidden).
    resultado: document.getElementById('resultado'),
    // O parágrafo de resumo exibido acima dos resultados.
    resumo: document.getElementById('resultado-resumo'),
    // O cartão destacado com o ponto de coleta mais próximo.
    destaque: document.getElementById('card-destaque'),
    // A caixa onde o mapa do Leaflet é desenhado.
    mapa: document.getElementById('mapa'),
    // A lista com todos os pontos encontrados.
    lista: document.getElementById('lista-pontos'),
    // O aviso "nenhum ponto desta busca aceita o material selecionado".
    listaVazia: document.getElementById('lista-vazia'),
    // A faixa de botões de filtro (Todos, Óleo de cozinha, Pilhas...).
    filtros: document.getElementById('filtros'),
    // A lista de materiais dentro da seção "Impacto".
    materiaisResumo: document.getElementById('materiais-resumo'),
    // O ano que aparece no rodapé (preenchido automaticamente pelo JavaScript).
    ano: document.getElementById('ano-atual'),
    // O link "Quero cadastrar um ponto".
    linkContato: document.getElementById('link-contato'),
    // O botãozinho de menu, que só aparece no celular.
    navToggle: document.querySelector('.nav-toggle'),
    // O menu de navegação do topo da página.
    nav: document.getElementById('menu-principal'),
    // O bloco com o mapa do estado que aparece junto com o resultado da busca.
    estadoBloco: document.getElementById('estado'),
    // O pino laranja que marca a região do CEP dentro do mapa do estado.
    estadoPin: document.getElementById('estado-pin'),
    // O círculo pulsante que anima em volta desse pino.
    estadoHalo: document.getElementById('estado-halo'),
    // A linha com o nome da cidade encontrada.
    estadoCidade: document.getElementById('estado-cidade'),
    // A frase de apoio embaixo do nome da cidade.
    estadoLegenda: document.getElementById('estado-legenda')
  // Fecha o objeto el.
  };

  // ------------------------------------------------------------------------
  // MEMÓRIA DA APLICAÇÃO (o "estado")
  // ------------------------------------------------------------------------

  // O estado guarda o que está acontecendo AGORA na tela, para não precisarmos
  // reconstruir tudo do zero a cada clique do usuário.
  var estado = {
    // Vai guardar o objeto do mapa depois de criado (começa vazio).
    mapa: null,
    // Camada (grupo) que contém os marcadores dos pontos de coleta.
    grupoPontos: null,
    // Camada (grupo) que contém o marcador e o círculo da sua localização.
    grupoUsuario: null,
    // De onde a busca partiu: coordenadas, CEP e endereço do usuário.
    usuario: null,
    // A lista de pontos já calculada e ordenada do mais perto ao mais longe.
    ordenados: [],
    // Qual filtro de material está ligado. 'todos' significa "sem filtro".
    materialAtivo: 'todos'
  // Fecha o objeto estado.
  };

  // ========================================================================
  // FUNÇÕES DE APOIO (utilitárias)
  // ========================================================================

  // Limpa um texto deixando apenas os números: soDigitos('01001-000') devolve '01001000'.
  function soDigitos(valor) {
    // Vira texto e troca tudo o que NÃO for número por nada (\D = não dígito; /g = todas as vezes).
    return String(valor || '').replace(/\D/g, '');
  // Fecha a função soDigitos.
  }

  // Aplica a máscara do CEP para exibir bonito na tela: 01001000 vira 01001-000.
  function formatarCep(valor) {
    // Pega só os números e corta em 8 dígitos (o tamanho de um CEP).
    var d = soDigitos(valor).slice(0, 8);
    // Até 5 dígitos devolve sem tracinho, porque ainda não dá para saber onde ele fica.
    if (d.length <= 5) return d;
    // Depois disso, devolve os 5 primeiros dígitos + tracinho + o restante.
    return d.slice(0, 5) + '-' + d.slice(5);
  // Fecha a função formatarCep.
  }

  // SEGURANÇA: troca caracteres perigosos por códigos seguros antes de colocar
  // o texto no HTML. Sem isso, um nome com "<script>" poderia rodar código na página.
  function escaparHtml(valor) {
    // Vira texto (ou texto vazio, se vier nulo) e já encadeia as cinco trocas abaixo.
    return String(valor == null ? '' : valor)
      // Troca & por &amp; (precisa ser o primeiro, senão estragaria as trocas seguintes).
      .replace(/&/g, '&amp;')
      // Troca < por &lt; (impede abrir uma tag HTML).
      .replace(/</g, '&lt;')
      // Troca > por &gt; (impede fechar uma tag HTML).
      .replace(/>/g, '&gt;')
      // Troca aspas duplas por &quot; (impede "escapar" de um atributo).
      .replace(/"/g, '&quot;')
      // Troca aspas simples por &#39; (mesma proteção).
      .replace(/'/g, '&#39;');
  // Fecha a função escaparHtml.
  }

  // Deixa a distância legível: 0,35 -> "350 m" | 2,14 -> "2,1 km" | 42,7 -> "43 km".
  function formatarDistancia(km) {
    // Se o número não for válido, mostra "--".
    if (!isFinite(km)) return '--';
    // Abaixo de 1 km mostra em metros: multiplica por 1000 e arredonda.
    if (km < 1) return Math.round(km * 1000) + ' m';
    // Entre 1 e 10 km mostra uma casa decimal e troca o ponto pela vírgula (padrão brasileiro).
    if (km < 10) return km.toFixed(1).replace('.', ',') + ' km';
    // A partir de 10 km mostra um número inteiro arredondado.
    return Math.round(km) + ' km';
  // Fecha a função formatarDistancia.
  }

  // Distância em linha reta entre dois pontos da Terra (fórmula de Haversine).
  // Atenção: é a distância "de pássaro", não a distância de rua.
  function distanciaKm(lat1, lng1, lat2, lng2) {
    // Raio médio da Terra em quilômetros, usado no final do cálculo.
    var RAIO_TERRA = 6371;
    // Seno e cosseno trabalham com radianos, e as coordenadas chegam em graus: este é o fator de conversão.
    var rad = Math.PI / 180;
    // Diferença de latitude entre os dois pontos, já em radianos.
    var dLat = (lat2 - lat1) * rad;
    // Diferença de longitude entre os dois pontos, também em radianos.
    var dLng = (lng2 - lng1) * rad;
    // Primeira parte do cálculo: junta a diferença de latitude com a de longitude (corrigida pela latitude).
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      // O cosseno das latitudes aparece porque as linhas de longitude ficam mais juntas perto dos polos.
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    // Segunda parte: multiplica pelo raio da Terra e devolve a distância em quilômetros.
    return 2 * RAIO_TERRA * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Fecha a função distanciaKm.
  }

  // ------------------------------------------------------------------------
  // ETIQUETAS DE MATERIAL, ENDEREÇO, ROTA E AVISOS
  // ------------------------------------------------------------------------

  // Recebe o "id" de um material (ex.: 'oleo') e devolve o material completo
  // (nome e ícone) que está cadastrado em js/pontos.js.
  function rotuloMaterial(id) {
    // Percorre a lista de materiais, começando na posição 0.
    for (var i = 0; i < MATERIAIS.length; i++) {
      // Se o id bater com o material desta posição, devolve ele e para aqui.
      if (MATERIAIS[i].id === id) return MATERIAIS[i];
    // Fecha o bloco do for.
    }
    // Se não achou nada, devolve um material "genérico" para a tela nunca ficar sem etiqueta.
    return { id: id, rotulo: id, icone: '♻️' };
  // Fecha a função rotuloMaterial.
  }

  // Monta o endereço completo do ponto em uma frase só: rua, bairro e cidade/UF.
  // Exemplo: "Rua das Acácias, 120, Centro, São Paulo - SP".
  function montarEndereco(ponto) {
    // Cria a lista de pedaços na ordem em que devem aparecer na frase.
    var partes = [ponto.endereco, ponto.bairro, ponto.cidade + ' - ' + ponto.uf];
    // filter(Boolean) joga fora pedaços vazios; join(', ') cola os que sobraram separados por vírgula.
    return partes.filter(Boolean).join(', ');
  // Fecha a função montarEndereco.
  }

  // Monta o link do Google Maps que abre a rota em uma nova aba.
  // "origem" é de onde a pessoa está; "ponto" é para onde ela vai.
  function linkRota(origem, ponto) {
    // O Google espera o destino no formato "latitude,longitude".
    var destino = ponto.lat + ',' + ponto.lng;
    // Começa a montar o link já codificando o texto para o formato aceito em endereços de internet.
    var url = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destino) + '&travelmode=driving';
    // Se soubermos de onde a pessoa parte, acrescentamos a origem também.
    if (origem) {
      // Acrescenta o parâmetro de origem com as coordenadas de quem está buscando.
      url += '&origin=' + encodeURIComponent(origem.lat + ',' + origem.lng);
    // Fecha o bloco do if.
    }
    // Devolve o link pronto, para ser colocado no href do botão "Abrir rota".
    return url;
  // Fecha a função linkRota.
  }

  // Escreve uma mensagem na linha de aviso abaixo do campo de CEP.
  // O "tipo" muda a cor: 'erro' (vermelho), 'ok' (verde-água) ou 'info' (cinza).
  function feedback(mensagem, tipo) {
    // Proteção: se o elemento não existir na página, não faz nada.
    if (!el.feedback) return;
    // Monta o nome da classe CSS juntando a base com o tipo: 'form-feedback' + ' is-erro'.
    el.feedback.className = 'form-feedback' + (tipo ? ' is-' + tipo : '');
    // Coloca a mensagem dentro do elemento. O || '' evita a palavra "undefined" aparecer na tela.
    el.feedback.innerHTML = mensagem || '';
  // Fecha a função feedback.
  }

  /* ========================================================================
     CONSULTAS PUBLICAS: CEP E GEOCODIFICACAO
     ====================================================================== */

  // ========================================================================
  // CONSULTAS PÚBLICAS NA INTERNET: CEP E COORDENADAS
  // ========================================================================

  // Função auxiliar que faz o pedido pela internet (fetch) e já entrega o JSON pronto.
  // Se a resposta não for de sucesso, gera um erro com o código recebido, para quem chamou tratar.
  function buscarJson(url) {
    // Pede a URL avisando que esperamos JSON; quando a resposta chegar, executa a função de dentro do then.
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (resposta) {
      // Se o servidor respondeu com erro (404, 500...), interrompe aqui mesmo.
      if (!resposta.ok) throw new Error('Falha na consulta (' + resposta.status + ')');
      // Caso contrário, converte o corpo da resposta em um objeto JavaScript.
      return resposta.json();
    // Fecha o then e o fetch.
    });
  // Fecha a função buscarJson.
  }

  // BrasilAPI: devolve o endereço e, quando disponível, as coordenadas do CEP.
  // É a nossa fonte principal, porque já traz latitude e longitude.
  function consultarBrasilApi(cep) {
    // Monta a URL juntando o endereço da API com o CEP (somente números).
    return buscarJson(CFG.apiBrasilApi + cep).then(function (dados) {
      // Se a API disser que o CEP não existe, interrompe sinalizando erro.
      // É esse erro que faz o código tentar o ViaCEP logo depois.
      if (!dados || dados.erro) throw new Error('CEP não encontrado');
      // Deu certo: entrega os dados para quem chamou.
      return dados;
    // Fecha o then.
    });
  // Fecha a função consultarBrasilApi.
  }

  // ViaCEP: usado como alternativa quando a BrasilAPI não responde.
  // Ele entrega o endereço, mas NÃO entrega coordenadas.
  function consultarViaCep(cep) {
    // Monta a URL do ViaCEP (ele exige o /json/ no final do endereço).
    return buscarJson(CFG.apiViaCep + cep + '/json/').then(function (dados) {
      // O ViaCEP avisa que o CEP não existe mandando { erro: true }.
      if (!dados || dados.erro) throw new Error('CEP não encontrado');
      // Deu certo: entrega os dados de endereço.
      return dados;
    // Fecha o then.
    });
  // Fecha a função consultarViaCep.
  }

  // Nominatim (OpenStreetMap): converte um endereço escrito em coordenadas.
  function geocodificar(consulta) {
    // Monta a URL da consulta. Os pedaços importantes:
    // format=json -> resposta em JSON; limit=1 -> só o melhor resultado;
    // countrycodes=br -> busca só no Brasil; email=... -> identificação exigida pelo serviço;
    // q=... -> o endereço pesquisado, já codificado para caber em uma URL.
    var url = CFG.apiNominatim + 'search?format=json&limit=1&countrycodes=br' +
      // Acrescenta o e-mail de contato exigido pela política de uso do Nominatim.
      '&email=' + encodeURIComponent(CFG.contatoTecnico) +
      // Acrescenta o endereço que queremos localizar.
      '&q=' + encodeURIComponent(consulta);

    // Dispara a consulta e espera o resultado chegar.
    return buscarJson(url).then(function (resultados) {
      // Se vier uma lista vazia, não achamos o lugar: sinaliza erro.
      if (!resultados || !resultados.length) throw new Error('Endereço não localizado no mapa');
      // O Nominatim devolve texto, então convertemos para número com parseFloat.
      // Ele chama a longitude de "lon".
      return { lat: parseFloat(resultados[0].lat), lng: parseFloat(resultados[0].lon) };
    // Fecha o then.
    });
  // Fecha a função geocodificar.
  }

  // Nominatim reverso: coordenadas -> endereço (usado no botão de localização).
  // É o caminho contrário do geocodificar: aqui partimos das coordenadas.
  function geocodificarReverso(lat, lng) {
    // Monta a URL do modo "reverse" (reverso) do Nominatim.
    var url = CFG.apiNominatim + 'reverse?format=json&zoom=16&addressdetails=1' +
      // Acrescenta o e-mail de contato exigido pela política de uso do serviço.
      '&email=' + encodeURIComponent(CFG.contatoTecnico) +
      // Acrescenta a latitude e a longitude que queremos "traduzir" em endereço.
      '&lat=' + lat + '&lon=' + lng;

    // Consulta o serviço e, se der certo, pega só o campo display_name,
    // que é o endereço completo em uma linha só.
    return buscarJson(url)
      .then(function (dados) { return dados && dados.display_name ? dados.display_name : ''; })
      // Aqui a falha NÃO é um problema: se o endereço não vier, devolvemos texto vazio
      // e a tela simplesmente não mostra o complemento.
      .catch(function () { return ''; });
  // Fecha a função geocodificarReverso.
  }

  // CEP -> { lat, lng, endereco, cep, origem }
  // Esta é a função principal da busca. Estratégia em duas tentativas:
  //   1) BrasilAPI (endereço + coordenadas);
  //   2) ViaCEP (endereço) + Nominatim (coordenadas).
  function localizarPorCep(cep) {
    // TENTATIVA 1: pergunta para a BrasilAPI.
    return consultarBrasilApi(cep).then(function (dados) {
      // Monta o texto do endereço juntando rua, bairro e cidade/UF.
      // O filter(Boolean) descarta campos que vierem vazios.
      var endereco = [dados.street, dados.neighborhood, dados.city + ' - ' + dados.state]
        .filter(Boolean).join(', ');
      // Pega o bloco de coordenadas, se a BrasilAPI tiver mandado.
      var coords = dados.location && dados.location.coordinates;
      // Converte a latitude para número. Se não veio, vira NaN (valor inválido).
      var lat = coords ? parseFloat(coords.latitude) : NaN;
      // Faz a mesma coisa com a longitude.
      var lng = coords ? parseFloat(coords.longitude) : NaN;

      // Caminho feliz: endereço e coordenadas válidas, então já podemos responder.
      if (isFinite(lat) && isFinite(lng)) {
        // Devolve o resultado pronto, avisando que a fonte foi a BrasilAPI.
        return { lat: lat, lng: lng, cep: cep, endereco: endereco, origem: 'BrasilAPI' };
      // Fecha o bloco do if.
      }

      // Se a BrasilAPI não mandou coordenadas, montamos um endereço completo
      // (com "Brasil" no final) para o Nominatim conseguir localizar.
      var consulta = [dados.street, dados.neighborhood, dados.city, dados.state, 'Brasil']
        .filter(Boolean).join(', ');

      // Geocodifica esse endereço e devolve as coordenadas obtidas,
      // registrando que a fonte agora foi o OpenStreetMap.
      return geocodificar(consulta).then(function (geo) {
        return { lat: geo.lat, lng: geo.lng, cep: cep, endereco: endereco, origem: 'OpenStreetMap' };
      });
    // O catch abaixo só roda se a TENTATIVA 1 falhar por qualquer motivo:
    // CEP inexistente, internet fora, serviço fora do ar, etc.
    }).catch(function () {
      // TENTATIVA 2: pergunta o endereço para o ViaCEP.
      return consultarViaCep(cep).then(function (dados) {
        // O ViaCEP usa outros nomes de campo: logradouro, bairro, localidade e uf.
        var endereco = [dados.logradouro, dados.bairro, dados.localidade + ' - ' + dados.uf]
          .filter(Boolean).join(', ');
        // Monta o texto que será pesquisado no mapa. Começa pela rua (mais preciso);
        // se a rua não existir, sobram bairro, cidade e UF.
        var consulta = [dados.logradouro, dados.bairro, dados.localidade, dados.uf, 'Brasil']
          .filter(Boolean).join(', ');

        // Traduz esse endereço em coordenadas pelo Nominatim e devolve o resultado,
        // registrando que duas fontes foram usadas desta vez.
        return geocodificar(consulta).then(function (geo) {
          return { lat: geo.lat, lng: geo.lng, cep: cep, endereco: endereco, origem: 'ViaCEP + OpenStreetMap' };
        });
      // Fecha o then da tentativa 2.
      });
    // Fecha o catch e o bloco da tentativa 1.
    });
  // Fecha a função localizarPorCep.
  }

  // ========================================================================
  // CÁLCULO DE DISTÂNCIA E ORDENAÇÃO
  // ========================================================================

  // Recebe de onde a pessoa está e qual filtro está ligado; devolve a lista de
  // pontos do mais perto ao mais longe, já cortada no limite configurado.
  function ordenarPorDistancia(usuario, materialAtivo) {
    // Cria uma CÓPIA de cada ponto (com Object.assign) e acrescenta um campo novo
    // chamado "distancia" com a distância em km até o usuário.
    // Copiar é importante para não alterar a base original de pontos.
    var lista = PONTOS.map(function (ponto) {
      return Object.assign({}, ponto, {
        // Calcula a distância em linha reta do usuário até este ponto.
        distancia: distanciaKm(usuario.lat, usuario.lng, ponto.lat, ponto.lng)
      });
    });

    // Se existe um filtro escolhido (e ele não é 'todos'), vamos filtrar.
    if (materialAtivo && materialAtivo !== 'todos') {
      // Mantém na lista apenas os pontos que aceitam aquele material.
      lista = lista.filter(function (ponto) {
        // O indexOf devolve -1 quando o material não está na lista do ponto.
        return (ponto.materiais || []).indexOf(materialAtivo) !== -1;
      });
    // Fecha o bloco do if.
    }

    // Ordena a lista pela distância, do menor para o maior.
    lista.sort(function (a, b) { return a.distancia - b.distancia; });
    // Devolve no máximo "limitePontos" itens (configurado em js/pontos.js).
    return lista.slice(0, CFG.limitePontos);
  // Fecha a função ordenarPorDistancia.
  }

  // ========================================================================
  // ÍCONES EMBUTIDOS NO CÓDIGO (todos com o mesmo traço, no estilo da marca)
  // ========================================================================

  // Cada item é só o "miolo" de um desenho em SVG. A moldura completa é montada
  // pela função iconeSvg, logo abaixo. Usar SVG (em vez de imagem) deixa os
  // ícones nítidos em qualquer tamanho e na cor que o CSS mandar.
  var ICONES = {
    // Alfinete de mapa, usado no selo "Ponto mais próximo".
    pin: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    // Relógio, usado na linha "Funcionamento".
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    // Telefone, usado na linha "Contato".
    fone: '<path d="M5 3h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    // Seta de rota, usada no botão "Abrir rota".
    rota: '<path d="M3 11l19-8-8 19-2-9-9-2z"/>',
    // Alvo/mira, usado no botão "Ver no mapa".
    alvo: '<circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'
  };

  // Monta a moldura do SVG em volta do ícone escolhido.
  // "tamanho" é opcional: se você não informar, ele usa 18 pixels.
  function iconeSvg(caminho, tamanho) {
    // Primeira parte da tag: tamanho, cor herdada do CSS (currentColor) e traço arredondado.
    return '<svg viewBox="0 0 24 24" width="' + (tamanho || 18) + '" height="' + (tamanho || 18) +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
      // Segunda parte: aria-hidden esconde o desenho de leitores de tela (o texto ao lado já explica).
      'stroke-linejoin="round" aria-hidden="true">' + caminho + '</svg>';
  // Fecha a função iconeSvg.
  }

  // ========================================================================
  // DESENHAR NA TELA: CARTÃO DESTAQUE, LISTA, FILTROS E NÚMEROS
  // ========================================================================

  // Preenche o cartão grande (o do ponto mais próximo) com as informações do ponto.
  function renderDestaque(ponto, usuario) {
    // Monta as etiquetas dos materiais que este ponto recebe.
    // Cada material vira um <li> com o ícone e o nome cadastrado em pontos.js.
    var chips = (ponto.materiais || []).map(function (id) {
      // Descobre o nome e o ícone do material a partir do id (ex.: 'oleo').
      var mat = rotuloMaterial(id);
      // Monta a etiqueta em HTML, escapando o texto por segurança.
      return '<li class="chip-material">' + mat.icone + ' ' + escaparHtml(mat.rotulo) + '</li>';
    // Junta todas as etiquetas em um único texto de HTML.
    }).join('');

    // Decide a frase que explica de onde a distância foi medida:
    // se a busca veio de um CEP, mostra o CEP; se veio do GPS, mostra "sua localização".
    var referencia = usuario.cep
      ? 'em linha reta a partir do CEP ' + escaparHtml(formatarCep(usuario.cep))
      : 'em linha reta a partir da sua localização';

    // Aqui começa a montar o conteúdo HTML do cartão, pedaço por pedaço.
    el.destaque.innerHTML =
      // Selo laranja escrito "Ponto mais próximo", com o ícone de alfinete.
      '<span class="badge-mais-proximo">' + iconeSvg(ICONES.pin, 14) + ' Ponto mais próximo</span>' +
      // Nome do ponto de coleta.
      '<h3 class="ponto-nome">' + escaparHtml(ponto.nome) + '</h3>' +
      // Tipo do ponto (ONG, Pet shop...). Se não tiver, escreve "Ponto de coleta".
      '<span class="ponto-tipo">' + escaparHtml(ponto.tipo || 'Ponto de coleta') + '</span>' +
      // Distância em destaque (número grande) + a frase de referência.
      '<p class="distancia-destaque"><strong>' + formatarDistancia(ponto.distancia) + '</strong>' +
      '<span>' + referencia + '</span></p>' +
      // Começa a lista de informações (endereço, horário, contato).
      '<ul class="info-lista">' +
        // Endereço completo montado pela função montarEndereco + o CEP do ponto.
        '<li>' + iconeSvg(ICONES.pin) + '<span><b>Endereço:</b> ' +
          escaparHtml(montarEndereco(ponto)) + ' — CEP ' + escaparHtml(ponto.cep || 'não informado') + '</span></li>' +
        // Horário de funcionamento (se não tiver, avisa para consultar).
        '<li>' + iconeSvg(ICONES.relogio) + '<span><b>Funcionamento:</b> ' +
          escaparHtml(ponto.horario || 'consulte o ponto') + '</span></li>' +
        // Telefone: só aparece se o ponto tiver telefone cadastrado (senão, string vazia).
        (ponto.telefone
          ? '<li>' + iconeSvg(ICONES.fone) + '<span><b>Contato:</b> ' + escaparHtml(ponto.telefone) + '</span></li>'
          : '') +
      // Fecha a lista de informações.
      '</ul>' +
      // Materiais aceitos: o título e as etiquetas só aparecem se houver alguma.
      (chips ? '<h4>O que este ponto recebe</h4><ul class="chips-materiais">' + chips + '</ul>' : '') +
      // Começa a área dos botões de ação.
      '<div class="card-acoes">' +
        // Botão laranja que abre a rota no Google Maps em uma aba nova.
        '<a class="btn btn-primary" href="' + linkRota(usuario, ponto) +
          '" target="_blank" rel="noopener">' + iconeSvg(ICONES.rota) + ' Abrir rota</a>' +
        // Botão claro que aproxima o mapa neste ponto (o clique é tratado pelos eventos).
        '<button type="button" class="btn btn-ghost" data-centralizar="' + escaparHtml(ponto.id) + '">' +
          iconeSvg(ICONES.alvo) + ' Ver no mapa</button>' +
      // Fecha a área dos botões.
      '</div>' +
      // Observação do ponto: aparece só se existir (ex.: "Retirar senha na recepção").
      (ponto.obs ? '<p class="ponto-obs">' + escaparHtml(ponto.obs) + '</p>' : '');
  // Fecha a função renderDestaque.
  }

  // Preenche a lista de pontos que aparece abaixo do mapa.
  function renderLista(lista, usuario) {
    // Se a lista veio vazia, mostra apenas o aviso e para por aqui.
    if (!lista.length) {
      // Limpa a lista antiga.
      el.lista.innerHTML = '';
      // Mostra o aviso "nenhum ponto aceita o material selecionado".
      el.listaVazia.hidden = false;
      // Sai da função sem desenhar mais nada.
      return;
    // Fecha o bloco do if.
    }

    // Como temos itens, esconde o aviso de lista vazia.
    el.listaVazia.hidden = true;
    // Para cada ponto da lista, monta um <li> com as informações e junta tudo.
    el.lista.innerHTML = lista.map(function (ponto, indice) {
      // O primeiro item (indice 0) ganha a classe extra que o pinta de laranja.
      return '<li class="point-item' + (indice === 0 ? ' is-proximo' : '') + '">' +
        // A bolinha com o número da posição (1, 2, 3...).
        '<span class="point-rank" aria-hidden="true">' + (indice + 1) + '</span>' +
        // Começa o bloco de textos.
        '<div class="point-corpo">' +
          // Nome do ponto de coleta.
          '<h4>' + escaparHtml(ponto.nome) + '</h4>' +
          // Endereço completo + CEP.
          '<p class="point-linha">' + escaparHtml(montarEndereco(ponto)) +
            ' · CEP ' + escaparHtml(ponto.cep || 'não informado') + '</p>' +
          // Horário: só aparece se o ponto tiver horário cadastrado.
          (ponto.horario ? '<p class="point-linha">' + escaparHtml(ponto.horario) + '</p>' : '') +
        // Fecha o bloco de textos.
        '</div>' +
        // Começa o bloco da direita, com a distância e os links.
        '<div class="point-distancia">' +
          // Distância em destaque.
          '<strong>' + formatarDistancia(ponto.distancia) + '</strong>' +
          // Legenda embaixo do número, diferente para o primeiro item.
          '<span>' + (indice === 0 ? 'mais próximo' : 'em linha reta') + '</span>' +
          // Dois links rápidos: abrir a rota e centralizar o mapa.
          '<div class="point-links">' +
            // Link para o Google Maps (abre em aba nova).
            '<a href="' + linkRota(usuario, ponto) + '" target="_blank" rel="noopener">Rota</a>' +
            // Link que aproxima o mapa neste ponto (marcado com data-centralizar).
            '<a href="#" data-centralizar="' + escaparHtml(ponto.id) + '">Mapa</a>' +
          // Fecha o bloco dos links.
          '</div>' +
        // Fecha o bloco da direita.
        '</div>' +
      // Fecha o item da lista.
      '</li>';
    // Junta todos os itens em um único texto de HTML.
    }).join('');
  // Fecha a função renderLista.
  }

  // Monta os botões de filtro por material (Todos, Óleo de cozinha, Pilhas...).
  // Os botões são gerados a partir da lista de materiais do js/pontos.js.
  function renderFiltros() {
    // Proteção: se a faixa de filtros não existir na página, não faz nada.
    if (!el.filtros) return;

    // Objeto vazio que vai servir de "lista de materiais que algum ponto aceita".
    var usados = {};
    // Para cada ponto cadastrado...
    PONTOS.forEach(function (ponto) {
      // ...para cada material que aquele ponto aceita...
      (ponto.materiais || []).forEach(function (id) { usados[id] = true; });
      // (marcamos o id como true nesse objeto, funcionando como uma lista sem repetições)
    });

    // O primeiro botão é sempre o "Todos", já começando marcado (aria-pressed = true).
    var botoes = ['<button type="button" class="chip" data-material="todos" aria-pressed="true">Todos</button>'];
    // Agora percorremos todos os materiais cadastrados em pontos.js.
    MATERIAIS.forEach(function (mat) {
      // Se nenhum ponto aceita esse material, pulamos (não criamos botão inútil).
      if (!usados[mat.id]) return;
      // Caso contrário, criamos o botão do material, com ícone e nome.
      botoes.push('<button type="button" class="chip" data-material="' + escaparHtml(mat.id) +
        '" aria-pressed="false">' + mat.icone + ' ' + escaparHtml(mat.rotulo) + '</button>');
    // Fecha o bloco do forEach.
    });

    // Coloca todos os botões dentro da faixa de filtros.
    el.filtros.innerHTML = botoes.join('');
  // Fecha a função renderFiltros.
  }

  // Preenche os números da seção "Impacto" (pontos cadastrados, materiais e cidades).
  // Tudo é calculado a partir da base, então nunca ficam números "inventados".
  function atualizarEstatisticas() {
    // Objeto que vai guardar os materiais encontrados (sem repetir).
    var materiais = {};
    // Objeto que vai guardar as cidades encontradas (sem repetir).
    var cidades = {};

    // Para cada ponto cadastrado...
    PONTOS.forEach(function (ponto) {
      // ...marca cada material que ele aceita.
      (ponto.materiais || []).forEach(function (id) { materiais[id] = true; });
      // ...e marca a cidade dele. Usamos "cidade/UF" em minúsculas para não
      // contar a mesma cidade duas vezes por causa de maiúsculas/minúsculas.
      if (ponto.cidade) cidades[(ponto.cidade + '/' + (ponto.uf || '')).toLowerCase()] = true;
    // Fecha o bloco do forEach.
    });

    // Junta os três números que vamos mostrar na tela.
    var valores = {
      // Quantos pontos existem na base.
      pontos: PONTOS.length,
      // Quantos materiais diferentes algum ponto aceita (Object.keys conta as chaves).
      materiais: Object.keys(materiais).length,
      // Quantas cidades diferentes são atendidas.
      cidades: Object.keys(cidades).length
    };

    // Para cada um dos três números...
    Object.keys(valores).forEach(function (chave) {
      // ...procura na página o elemento marcado com [data-stat="nomeDoNumero"].
      var alvo = document.querySelector('[data-stat="' + chave + '"]');
      // Se ele existir, escreve o número dentro dele.
      if (alvo) alvo.textContent = valores[chave];
    // Fecha o bloco do forEach.
    });

    // Se existir a lista de materiais da seção Impacto, preenche cada item com ícone + nome.
    if (el.materiaisResumo) {
      el.materiaisResumo.innerHTML = MATERIAIS.map(function (mat) {
        return '<li>' + mat.icone + ' ' + escaparHtml(mat.rotulo) + '</li>';
      }).join('');
    // Fecha o bloco do if.
    }
  // Fecha a função atualizarEstatisticas.
  }

  /* ========================================================================
     MAPA (Leaflet + tiles claros do CARTO)
     ====================================================================== */

  function pinSvg(cor, numero) {
    var centro = numero
      ? '<text x="15" y="19.5" text-anchor="middle" font-size="12" font-weight="700" fill="' +
          cor + '" font-family="Poppins, Arial, sans-serif">' + numero + '</text>'
      : '<circle cx="15" cy="15" r="5" fill="' + cor + '"/>';

    return '<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">' +
      '<path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="' + cor + '"/>' +
      '<circle cx="15" cy="15" r="9.5" fill="#FFFFFF"/>' + centro + '</svg>';
  }

  function iconePonto(numero, destaque) {
    return L.divIcon({
      className: 'pin',
      html: pinSvg(destaque ? '#E35F1E' : '#347271', numero),
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      popupAnchor: [0, -34]
    });
  }

  function iniciarMapa() {
    if (estado.mapa) return estado.mapa;
    if (typeof L === 'undefined') return null;

    estado.mapa = L.map(el.mapa, { scrollWheelZoom: false, zoomControl: true })
      .setView([-23.5505, -46.6333], 12);

    L.tileLayer(TILES, {
      attribution: ATRIBUICAO,
      subdomains: 'abcd',
      maxZoom: 20,
      detectRetina: true
    }).addTo(estado.mapa);

    estado.grupoPontos = L.layerGroup().addTo(estado.mapa);
    estado.grupoUsuario = L.layerGroup().addTo(estado.mapa);
    return estado.mapa;
  }

  function desenharMapa(usuario, lista) {
    var mapa = iniciarMapa();
    if (!mapa) return;

    estado.grupoPontos.clearLayers();
    estado.grupoUsuario.clearLayers();

    /* Area de incerteza da localizacao (o CEP nao aponta uma casa exata). */
    var raio = usuario.aproximado ? CFG.raioIncertezaCepMetros : (usuario.precisao || 400);

    L.circle([usuario.lat, usuario.lng], {
      radius: raio,
      color: '#347271',
      weight: 2,
      opacity: .9,
      fillColor: '#347271',
      fillOpacity: .12
    }).addTo(estado.grupoUsuario);

    L.marker([usuario.lat, usuario.lng], {
      icon: L.divIcon({ className: 'pin-user', html: '', iconSize: [26, 26], iconAnchor: [13, 13] }),
      keyboard: false,
      title: 'Sua região aproximada'
    })
      .bindPopup('<b>Sua região aproximada</b>' + escaparHtml(usuario.endereco || 'Local estimado'))
      .addTo(estado.grupoUsuario);

    var cantos = [[usuario.lat, usuario.lng]];

    lista.forEach(function (ponto, indice) {
      var destaque = indice === 0;

      L.marker([ponto.lat, ponto.lng], {
        icon: iconePonto(indice + 1, destaque),
        title: ponto.nome
      })
        .bindPopup(
          '<b>' + escaparHtml(ponto.nome) + '</b>' +
          escaparHtml(montarEndereco(ponto)) + '<br>' +
          formatarDistancia(ponto.distancia) + ' em linha reta' +
          (destaque ? '<br><strong>Ponto mais próximo</strong>' : '')
        )
        .addTo(estado.grupoPontos);

      cantos.push([ponto.lat, ponto.lng]);
    });

    /* Linha pontilhada ligando a sua regiao ao ponto mais proximo. */
    if (lista.length) {
      L.polyline([[usuario.lat, usuario.lng], [lista[0].lat, lista[0].lng]], {
        color: '#E35F1E',
        weight: 3,
        opacity: .75,
        dashArray: '6 8'
      }).addTo(estado.grupoUsuario);
    }

    mapa.fitBounds(L.latLngBounds(cantos), { padding: [40, 40], maxZoom: 14 });
    window.setTimeout(function () { mapa.invalidateSize(); }, 120);
  }

  function centralizarEm(id) {
    if (!estado.mapa) return;

    for (var i = 0; i < estado.ordenados.length; i++) {
      if (estado.ordenados[i].id === id) {
        estado.mapa.setView([estado.ordenados[i].lat, estado.ordenados[i].lng], 16, { animate: true });
        if (el.mapa.scrollIntoView) {
          el.mapa.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }
  }

  /* ========================================================================
     MAPA DO ESTADO (o desenho que acompanha o resultado da busca)
     ====================================================================== */

  // Põe o pino laranja no lugar do estado onde caiu a região do CEP e escreve
  // o nome da cidade ao lado. Se o CEP for de fora de São Paulo, esconde o pino
  // em vez de marcá-lo num lugar errado do desenho.
  function desenharNoEstado(usuario) {
    // Se a página não tiver o bloco do estado, não há o que desenhar.
    if (!el.estadoBloco || !el.estadoPin) return;

    // Converte a latitude/longitude reais em um ponto x/y do desenho.
    var ponto = pontoNoEstado(usuario.lat, usuario.lng);

    // O pino só faz sentido dentro da área do desenho (0..640 no x, 0..429 no y).
    var dentroDoDesenho = ponto.x >= 0 && ponto.x <= MAPA_ESTADO.largura &&
                          ponto.y >= 0 && ponto.y <= MAPA_ESTADO.altura;

    // Move o pino laranja para a posição calculada.
    el.estadoPin.setAttribute('cx', ponto.x);
    el.estadoPin.setAttribute('cy', ponto.y);

    // O círculo pulsante acompanha o pino, um pouco maior que ele.
    if (el.estadoHalo) {
      el.estadoHalo.setAttribute('cx', ponto.x);
      el.estadoHalo.setAttribute('cy', ponto.y);
    }

    // A classe "fora" é o que faz o CSS esconder o pino quando o CEP não é de SP.
    el.estadoBloco.classList.toggle('fora', !dentroDoDesenho);

    // Descobre o nome da cidade a partir do endereço que veio da consulta do CEP.
    var cidade = nomeDaCidade(usuario.endereco);

    // Texto principal: a cidade encontrada ou o aviso de que o CEP é de outro estado.
    if (el.estadoCidade) {
      el.estadoCidade.textContent = dentroDoDesenho
        ? (cidade || 'Sua região aproximada')
        : 'CEP fora do estado de São Paulo';
    }

    // Frase de apoio, lembrando que a posição no desenho é uma aproximação.
    if (el.estadoLegenda) {
      el.estadoLegenda.textContent = dentroDoDesenho
        ? 'O pino laranja mostra, por aproximação, onde cai o CEP informado dentro do estado.'
        : 'Os pontos continuam valendo: as distâncias são calculadas mesmo quando o CEP é de outro estado.';
    }
  }

  /* ========================================================================
     FLUXO PRINCIPAL DA BUSCA
     ====================================================================== */

  function definirCarregando(ativo, texto) {
    if (el.btnBuscar) {
      el.btnBuscar.disabled = ativo;
      el.btnBuscar.textContent = ativo ? 'Buscando...' : 'Buscar ponto';
    }
    if (el.input) el.input.setAttribute('aria-busy', ativo ? 'true' : 'false');
    if (ativo && texto) feedback(texto, 'info');
  }

  function mensagemDeErro(erro) {
    var texto = (erro && erro.message) || '';

    if (texto.indexOf('não encontrado') !== -1) {
      return 'CEP não encontrado. Confira os 8 números e tente novamente.';
    }
    if (texto.indexOf('não localizado') !== -1) {
      return 'Não conseguimos localizar esse endereço no mapa. Tente outro CEP da mesma região.';
    }
    return 'Não foi possível consultar o CEP agora. Verifique a sua conexão e tente de novo.';
  }

  function atualizarResumo(usuario, lista, proximo) {
    if (!el.resumo) return;

    var referencia = usuario.cep
      ? 'CEP ' + escaparHtml(formatarCep(usuario.cep))
      : 'sua localização atual';

    el.resumo.innerHTML = 'Buscamos a partir do <strong>' + referencia + '</strong>' +
      (usuario.endereco ? ' — ' + escaparHtml(usuario.endereco) : '') +
      '. Encontramos <strong>' + lista.length + '</strong> ' +
      (lista.length === 1 ? 'ponto de coleta' : 'pontos de coleta') +
      ' e o mais próximo está a <strong>' + formatarDistancia(proximo.distancia) +
      '</strong> em linha reta.';
  }

  function aplicarBusca(usuario) {
    estado.usuario = usuario;

    // Marca no desenho do estado onde caiu a região desta busca.
    desenharNoEstado(usuario);

    if (!PONTOS.length) {
      el.resultado.hidden = false;
      el.destaque.innerHTML = '<p class="empty-state">Nenhum ponto de coleta cadastrado ainda. ' +
        'Adicione registros em <code>js/pontos.js</code> para que a busca mostre resultados.</p>';
      el.lista.innerHTML = '';
      el.listaVazia.hidden = true;
      if (el.resumo) el.resumo.textContent = '';
      return;
    }

    var lista = ordenarPorDistancia(usuario, estado.materialAtivo);
    estado.ordenados = lista;
    el.resultado.hidden = false;

    if (!lista.length) {
      el.destaque.innerHTML = '<p class="empty-state">Nenhum ponto desta busca aceita o material ' +
        'selecionado. Escolha outro filtro para ver os pontos disponíveis.</p>';
      if (el.resumo) el.resumo.textContent = '';
      renderLista([], usuario);
      desenharMapa(usuario, []);
      return;
    }

    atualizarResumo(usuario, lista, lista[0]);
    renderDestaque(lista[0], usuario);
    renderLista(lista, usuario);
    desenharMapa(usuario, lista);
  }

  function atualizarUrl(cep) {
    if (!window.history || !window.history.replaceState) return;
    try {
      window.history.replaceState(null, '', window.location.pathname + '?cep=' + cep + '#resultado');
    } catch (erro) {
      /* navegadores bloqueiam replaceState em arquivos locais (file://) */
    }
  }

  function cepDaUrl() {
    var encontrado = /[?&]cep=(\d{8})/.exec(window.location.search);
    return encontrado ? encontrado[1] : '';
  }

  function buscarPorCep(cep) {
    if (!/^\d{8}$/.test(cep)) {
      if (el.campo) el.campo.classList.add('is-erro');
      feedback('Digite um CEP com 8 números (ex.: 01001-000).', 'erro');
      return;
    }

    if (el.campo) el.campo.classList.remove('is-erro');
    definirCarregando(true, 'Localizando o CEP ' + formatarCep(cep) + '...');

    localizarPorCep(cep).then(function (usuario) {
      usuario.aproximado = true;
      definirCarregando(false);
      feedback('CEP localizado: ' + escaparHtml(usuario.endereco || formatarCep(cep)), 'ok');
      aplicarBusca(usuario);
      atualizarUrl(cep);

      if (el.resultado.scrollIntoView) {
        el.resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }).catch(function (erro) {
      definirCarregando(false);
      feedback(mensagemDeErro(erro), 'erro');
    });
  }

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) {
      feedback('O seu navegador não oferece localização automática. Informe o CEP.', 'erro');
      return;
    }

    definirCarregando(true, 'Obtendo a sua localização...');

    navigator.geolocation.getCurrentPosition(function (posicao) {
      var usuario = {
        lat: posicao.coords.latitude,
        lng: posicao.coords.longitude,
        cep: '',
        endereco: '',
        aproximado: false,
        precisao: posicao.coords.accuracy || 400,
        origem: 'GPS do dispositivo'
      };

      definirCarregando(false);
      feedback('Localização obtida pelo dispositivo (precisão de aproximadamente ' +
        Math.round(usuario.precisao) + ' m).', 'ok');
      aplicarBusca(usuario);

      if (el.resultado.scrollIntoView) {
        el.resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      geocodificarReverso(usuario.lat, usuario.lng).then(function (endereco) {
        if (!endereco) return;
        usuario.endereco = endereco;
        if (estado.ordenados.length) {
          atualizarResumo(usuario, estado.ordenados, estado.ordenados[0]);
        }
      });
    }, function () {
      definirCarregando(false);
      feedback('Não foi possível obter a sua localização. Informe o CEP para continuar.', 'erro');
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  }

  /* ========================================================================
     EVENTOS E INICIALIZACAO
     ====================================================================== */

  function elementoDoClique(evento, seletor) {
    var alvo = evento.target;
    if (!alvo || typeof alvo.closest !== 'function') return null;
    return alvo.closest(seletor);
  }

  function ligarEventos() {
    if (el.form) {
      el.form.addEventListener('submit', function (evento) {
        evento.preventDefault();
        buscarPorCep(soDigitos(el.input.value));
      });
    }

    if (el.input) {
      el.input.addEventListener('input', function () {
        el.input.value = formatarCep(el.input.value);
        if (el.campo) el.campo.classList.remove('is-erro');
        feedback('');
      });
    }

    if (el.btnGeo) el.btnGeo.addEventListener('click', usarLocalizacaoAtual);

    if (el.filtros) {
      el.filtros.addEventListener('click', function (evento) {
        var botao = elementoDoClique(evento, 'button[data-material]');
        if (!botao) return;

        estado.materialAtivo = botao.getAttribute('data-material');
        Array.prototype.forEach.call(el.filtros.querySelectorAll('button'), function (outro) {
          outro.setAttribute('aria-pressed', outro === botao ? 'true' : 'false');
        });

        if (estado.usuario) aplicarBusca(estado.usuario);
      });
    }

    document.addEventListener('click', function (evento) {
      var alvo = elementoDoClique(evento, '[data-centralizar]');
      if (!alvo) return;
      evento.preventDefault();
      centralizarEm(alvo.getAttribute('data-centralizar'));
    });

    if (el.navToggle && el.nav) {
      el.navToggle.addEventListener('click', function () {
        var aberto = el.nav.classList.toggle('is-open');
        el.navToggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      });
    }
  }

  function iniciar() {
    if (el.ano) el.ano.textContent = new Date().getFullYear();

    if (el.linkContato && CFG.contatoEmail) {
      el.linkContato.href = 'mailto:' + CFG.contatoEmail +
        '?subject=' + encodeURIComponent('Quero cadastrar um ponto de coleta no EcoPatas');
    }

    renderFiltros();
    atualizarEstatisticas();
    ligarEventos();

    if (!PONTOS.length) {
      feedback('Nenhum ponto cadastrado em js/pontos.js. Adicione registros para a busca funcionar.', 'info');
    }

    var cepInicial = cepDaUrl();
    if (cepInicial && el.input) {
      el.input.value = formatarCep(cepInicial);
      buscarPorCep(cepInicial);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }





})();

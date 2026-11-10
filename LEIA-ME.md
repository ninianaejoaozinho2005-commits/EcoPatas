# EcoPatas

Site que recebe um **CEP**, estima a região do usuário e mostra, em um mapa, o
**ponto de coleta mais próximo** da rede cadastrada.

Cores da marca: laranja `#E35F1E`, teal `#347271` e branco `#FFFFFF`.
Imagens da marca em `OsAssets/` (logo `logo.png`, ilustração `animais.png`).

---

## Como rodar

Não precisa de build nem de instalação.

1. Abra o arquivo `index.html` no navegador (duplo clique), **ou**
2. No VS Code, use a extensão *Live Server* (botão direito em `index.html` → *Open with Live Server*).

> Recomendado usar Live Server. Alguns navegadores restringem requisições feitas
> direto do disco (`file://`), e aí a consulta de CEP pode falhar.

---

## Estrutura dos arquivos

```
EcoPatas/
├─ index.html          → página única (hero + resultados + como funciona + rodapé)
├─ css/style.css       → estilos e responsividade
├─ js/pontos.js        → BASE DE DADOS dos pontos de coleta + configurações
├─ js/app.js           → lógica: CEP → coordenadas → distância → mapa
└─ OsAssets/           → logo e ilustração da marca
```

---

## Como cadastrar os pontos reais

Abra `js/pontos.js` e edite a lista `window.ECOPATAS_PONTOS`.
Cada ponto precisa destes campos:

| Campo | Exemplo | Observação |
|---|---|---|
| `id` | `'sp-centro-01'` | único na lista |
| `nome` | `'Abrigo Amigo Fiel'` | aparece no card e no mapa |
| `tipo` | `'ONG'`, `'Pet shop'`, `'Clinica veterinaria'`, `'Ecoponto'`, `'Condominio'` | texto livre |
| `endereco` | `'Rua das Flores, 120'` | rua e número |
| `bairro` | `'Centro'` | |
| `cidade` | `'São Paulo'` | |
| `uf` | `'SP'` | |
| `cep` | `'01001-000'` | com ou sem traço |
| `telefone` | `'(11) 90000-0000'` | opcional |
| `horario` | `'Seg a sex, 9h às 18h'` | |
| `materiais` | `['medicamentos', 'racao']` | use os ids de `ECOPATAS_MATERIAIS` |
| `lat` | `-23.5505` | latitude |
| `lng` | `-46.6333` | longitude |
| `obs` | `'Retirar senha na recepção'` | opcional |

### Como descobrir latitude e longitude

1. Abra <https://www.openstreetmap.org> e encontre o endereço.
2. Clique com o botão direito no ponto exato → copie as coordenadas, **ou**
   use <https://nominatim.openstreetmap.org/search>.
3. Cole em `lat` e `lng` (no Brasil os dois valores são negativos).

### Materiais aceitos

Os filtros da tela são gerados a partir de `window.ECOPATAS_MATERIAIS`.
Para incluir um material novo: acrescente um item nessa lista
(`{ id, rotulo, icone }`) e use o mesmo `id` dentro de `materiais` dos pontos.

---

## Configurações disponíveis (`js/pontos.js`)

| Chave | Para que serve |
|---|---|
| `contatoEmail` | destino do botão “Quero cadastrar um ponto” |
| `raioKm` | raio máximo considerado (km) |
| `limitePontos` | quantos pontos exibir na lista e no mapa |
| `raioIncertezaCepMetros` | raio do círculo de incerteza desenhado sobre o CEP |
| `modoDemonstracao` | liga/desliga os avisos de dados de demonstração |

---

## Como a busca funciona

1. **CEP → endereço + coordenadas**: consulta a
   [BrasilAPI](https://brasilapi.com.br/docs#tag/CEP-V2) (`/api/cep/v2/{cep}`),
   que costuma devolver o endereço e as coordenadas do CEP.
   Se ela falhar, o site usa o [ViaCEP](https://viacep.com.br/) para o endereço e o
   [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org/) para as coordenadas.
2. **Distância**: fórmula de Haversine (distância em linha reta, não distância de rua).
3. **Ordenação**: do mais próximo para o mais distante; o primeiro é destacado em laranja.
4. **Mapa**: [Leaflet](https://leafletjs.com/) com tiles claros do CARTO sobre dados do
   OpenStreetMap. A posição do usuário aparece como um círculo de incerteza (o CEP aponta
   uma faixa de ruas, não uma casa) e há uma linha pontilhada até o ponto mais próximo.
5. **Localização do navegador**: o botão “Usar minha localização atual” usa
   `navigator.geolocation` e converte as coordenadas em endereço pelo Nominatim reverso.

Nada é gravado em servidor: todo o cálculo acontece no navegador.

---

## Avisos importantes

- A base em `js/pontos.js` contém **dados fictícios de demonstração** (nomes,
  endereços, telefones e CEPs inventados). Troque por dados reais antes de publicar.
- A distância exibida é **em linha reta**; a rota real pode ser maior.
- O Nominatim pede um e-mail de contato nas requisições. Troque
  `contatoTecnico` em `js/pontos.js` por um e-mail válido do projeto antes de ir
  para produção e evite muitas buscas seguidas (limite de uso do serviço público).
- As imagens da marca ficam em `OsAssets/`; mantenha os nomes dos arquivos ou
  atualize os caminhos em `index.html`.

---

## Próximos passos sugeridos

- [ ] Substituir os dados de demonstração por pontos reais verificados.
- [ ] Definir o e-mail de contato do projeto (`contatoEmail` e `contatoTecnico`).
- [ ] Publicar em um serviço estático (GitHub Pages, Netlify, Vercel) para ganhar HTTPS
      — a geolocalização do navegador exige HTTPS.
- [ ] Revisar textos legais (política de privacidade e aviso de cookies, se houver).

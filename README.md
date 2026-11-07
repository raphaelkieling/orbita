# Órbita

React + Vite, globo 3D em preto e branco e repetição espaçada com [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs).

```sh
npm ci
npm run dev
```

`npm run build` gera a versão de produção; `npm run preview` serve esse build.

## Abas

- **Aprender:** o jogo de localizar países e capitais. Escolha o tipo e uma região. Cada sessão tem até 10 lugares, sem repetir países; recortes menores usam todos os países disponíveis.
- **Explorar:** atlas livre. Passe o mouse ou clique no país para ver nome, capital e bandeira. A busca e a lista respeitam a região selecionada. “Estudar este país” abre seus dois cartões em Aprender. Explorar não cria revisões FSRS.
- **Progresso:** confiança, histórico e próximas revisões por país/capital, com busca e filtros por região e tipo.

Regiões: Mundo, Oriente Médio, América Latina, América do Sul, América do Norte, América Central, Caribe, Europa, África, Ásia, Leste Asiático, Sudeste Asiático e Oceania. A região é compartilhada entre as abas; mudar o recorte inicia uma nova sessão sem apagar o progresso.

O mapa contém 177 países e territórios; 167 países estão disponíveis para estudo, com 334 cartões. Fontes e critérios em `src/data/README.md`.

## Jogo e atalhos

Arraste o globo, use o scroll ou os botões +/− e clique para marcar um palpite.

| Atalho | Ação |
| --- | --- |
| Enter | Confirmar o palpite ou avançar depois da avaliação |
| N | Não sei: revelar a resposta e registrar Repetir |
| 1 | Difícil |
| 2 | Bom |
| 3 | Fácil |
| Setas, +/− | Girar/aproximar com o globo focado |

Os atalhos não disparam ao escrever em buscas, operar seletores ou com as instruções abertas. Teclas mantidas pressionadas não repetem respostas. Enter em um botão preserva sua ação nativa.

Países: um ponto dentro da fronteira vale 1.000 pontos. Capitais: tolerância de 300 km, com 500 a 1.000 pontos por acerto. Depois de um acerto, escolha Difícil/Bom/Fácil; erros e “Não sei” são registrados como Repetir. Os botões de zoom ajustam a câmera diretamente para permitir cliques rápidos sem sobrepor animações.

## FSRS e armazenamento

Todos os modos de Aprender alimentam o mesmo progresso. País e capital são cartões independentes. “Estudar agora” prioriza revisões vencidas, em ordem de vencimento, e completa com cartões novos, respeitando tipo e região. “Praticar” também permite revisar um cartão antes do vencimento.

Agendamento com ts-fsrs 5.4.2 (FSRS-6), retenção desejada de 90%, passos curtos padrão e sem aleatoriedade. A confiança é a probabilidade estimada de lembrar **daqui a 7 dias**, separada da taxa de acerto. Estimativas e vencimentos atualizam a cada 30 segundos.

O progresso é salvo em `localStorage` (`orbita-fsrs-v1`). O histórico dos países originais é preservado. Dados inválidos não são sobrescritos; falhas de armazenamento aparecem na interface. Sem backend ou sincronização: limpar os dados do navegador remove o progresso.

## GitHub Pages

O workflow `.github/workflows/pages.yml` publica automaticamente a cada push na **branch padrão do repositório**, independentemente de seu nome. Também aceita execução manual em Actions. Instala com `npm ci`, gera `dist` e publica usando as ações oficiais do GitHub Pages.

Depois de criar o repositório e enviar o projeto:

1. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
2. Faça um push na branch padrão ou execute **Deploy GitHub Pages** na aba Actions.

Não precisa configurar nome de usuário, repositório ou token no código. O workflow lê o caminho do Pages e passa o `base` correto ao Vite, incluindo sites em `/nome-do-repositorio/` e domínios personalizados. Links internos, favicon e assets acompanham esse caminho.

Para conferir o mesmo formato localmente:

```sh
npm run build -- --base /geoguesser/
npm run preview -- --base /geoguesser/
```

O workflow está preparado, mas a publicação só poderá ser verificada depois que o repositório existir e o Pages estiver habilitado.

## Validação

Build de produção na raiz e em subdiretório, checagens pontuais de geografia/filtros/FSRS/persistência e fluxos desktop no navegador. Sem testes unitários, conforme solicitado. O globo exige WebGL. Todos os dados e fontes são empacotados localmente, sem API externa durante o uso.

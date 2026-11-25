# Associação Oásis de Pompéia — site e sistema de eventos

Site institucional e sistema de gestão de eventos e chaveamentos (lutas e esportes coletivos), com programação cultural, feito **só com HTML, CSS e JavaScript**. Não usa Python nem banco de dados externo: **os dados ficam guardados no navegador** do computador onde o sistema é usado.

## Para todos verem os mesmos dados: coloque online
Mandar os arquivos para outras pessoas **não** junta os dados: cada computador vira um site separado.
Para que as inscrições de qualquer pessoa cheguem até você, siga o **[COLOCAR-ONLINE.md](COLOCAR-ONLINE.md)**:
- cria um banco de dados gratuito no Firebase e cola a configuração em `js/firebase-config.js`;
- publica a pasta no Netlify;
- depois disso, você manda **o link** do site para as pessoas.

Sem a configuração do Firebase, o site continua funcionando no modo local descrito abaixo.

## Como abrir

1. **Extraia o zip primeiro.** No Windows: botão direito no `oasis-site.zip` → **Extrair tudo…** → Extrair. Abrir o site de dentro do zip, sem extrair, não funciona.
2. Entre na pasta `oasis-site` extraída e **dê dois cliques no `index.html`**. O site abre no navegador (Chrome, Edge ou Firefox). Não precisa instalar nada.

Também abre pelo VS Code com a extensão **Live Server** (botão direito no `index.html` → **Open with Live Server**) ou pelo `Iniciar (Windows).bat`.

> Os dados ficam guardados por endereço: o que foi cadastrado abrindo com dois cliques não aparece no Live Server (http://localhost:5500), e vice-versa. Escolha um jeito e use sempre o mesmo, ou passe os dados com **Painel > Backup**.

### Se você alterar o código JavaScript
O `index.html` carrega um arquivo único, `js/site.bundle.js`, montado a partir da pasta `js/`. Depois de mudar qualquer arquivo em `js/`, gere de novo com `npm install esbuild` (uma vez) e `npm run bundle`. HTML e CSS não precisam disso.

**Acesso administrativo inicial:** `adm@gmail.com` / `67676767`. A senha não está no código: só o hash PBKDF2 (`js/data/local.js`). Troque-a em **Painel > Trocar senha** antes de cadastrar dados reais. Enquanto não trocar, o painel mostra um aviso.

## Onde ficam os dados (importante)

Tudo fica no **armazenamento do navegador** (localStorage), neste computador. Isso inclui cadastros, chaves, súmulas, notícias, fotos e configurações.

- **Use sempre o mesmo navegador e o mesmo endereço** (http://localhost:5500). Outro navegador, outro computador ou outro endereço não veem os dados.
- **Limpar o histórico ou os dados de navegação apaga tudo.** Faça backups em **Painel > Backup dos dados** pelo menos uma vez por semana e depois de cada evento. Guarde o arquivo em pendrive ou na nuvem da instituição.
- Para usar em outro computador, baixe o backup em um e use **Restaurar** no outro.
- O espaço do navegador é de cerca de 5 MB. As fotos são reduzidas automaticamente, e a tela de backup mostra quanto já foi usado.
- **Segurança:** quem tiver acesso a este computador e a este navegador consegue ler os dados. Use um usuário do Windows protegido por senha. O arquivo de backup também contém dados de crianças: guarde-o em local protegido.

### Limitação
Como os dados ficam em um só navegador, **o sistema funciona em um computador** (por exemplo, o da secretaria ou o da mesa do evento). Se você publicar estes arquivos na internet, cada visitante verá apenas o conteúdo inicial. Os eventos, chaves e notícias cadastrados no seu computador não aparecem para ele, e cadastros feitos pelas famílias em casa não chegam até você. Para o site público receber inscrições das famílias e mostrar resultados ao vivo, é preciso guardar os dados em um servidor ou serviço em nuvem.

## Três sites em um: cada público vê o seu

| Quem | Página inicial | Menu do topo | O que pode acessar |
|---|---|---|---|
| **Visitante** (não inscrito) | Site institucional: Oásis, projetos, notícias e agenda | Início · A Oásis · Projetos · Esportes · Conteúdo · Participe · *Já sou inscrito* · *Inscreva-se* | Só as páginas públicas. Tentar abrir a área de inscritos leva para a tela de entrar. |
| **Aluno inscrito** | "Olá, Fulano!": próximo compromisso, inscrições, apresentações, avisos | Início · Minha agenda · Competições · Apresentações · Avisos · Meus dados · Site da Oásis · Sair | A própria área e o site institucional (pelo menu "Site da Oásis"). Não vê cadastro nem entrar, e não acessa o painel. |
| **Professor** | "Olá, Fulano!" com as ferramentas do professor | Início · Minha agenda · Apresentações · Avisos · Central do evento · Meus dados · Site da Oásis · Sair | A própria área, a Central do evento, o calendário e os roteiros de palco. |
| **Coordenação** | Central do evento | Central do evento · Eventos · Pessoas · Avisos · Site · Backup · Sair | Tudo. |

O endereço é o mesmo (http://localhost:5500); o que muda é quem está conectado. Ao entrar, cada pessoa cai direto na sua página inicial. Ao sair, volta para o site público.

## O que o sistema faz

**Site público** (no modelo do site atual da Oásis): Início · A Oásis (quem somos, história, missão/visão/valores, transparência) · Projetos (os três projetos e o esporte inclusivo) · Esportes (modalidades, calendário esportivo, busca de professores) · Conteúdo (notícias e eventos) · Participe (inscrições, como ajudar, doações, contato), mais o rodapé com contatos e links legais.

**Cadastro com LGPD/ECA:** quatro perfis (Professor, Artista, Atleta, Lutador). Menores de 18 anos só se cadastram com o responsável legal, e cada consentimento fica registrado (quem, vínculo, data e versão do termo). A deficiência é opcional e sigilosa, com consentimento específico; cada consulta da coordenação é registrada. O aluno pode baixar os próprios dados e excluir a conta.

**Área do aluno** (link "Área do aluno" no topo do site, para quem já é inscrito):
- **Início:** próximo compromisso, inscrições, apresentações e avisos novos.
- **Minha agenda:** jogos, lutas e apresentações em ordem de horário, com aviso de conflito (dá para imprimir).
- **Competições e resultados:** cada disputa com adversário, horário, vitória/derrota e placar, a colocação (campeão, vice, eliminado na semifinal…) e a inscrição em competições abertas.
- **Apresentações:** horário, ordem de entrada e a função do aluno no palco.
- **Avisos** enviados pela coordenação.
- **Perfil e modalidades**, **acessibilidade** e **privacidade e autorizações** (autorizar ou retirar o uso de imagem, baixar os dados, excluir a conta).
- **Comprovante de inscrição** para imprimir.
- Professores têm a **Área do professor**, com agenda, apresentações que acompanham, avisos e acesso à Central do evento.

**Esqueceu a senha?** A coordenação abre a pessoa em **Painel > Pessoas** e clica em **Gerar senha provisória**. No primeiro acesso com ela, o sistema pede uma senha nova.

**Painel:**
- **Central do evento:** programação unificada de palco e quadra com resultados, conflitos de horário, pendências, andamento das chaves e ordem do palco.
- **Divisões por idade e peso (lutas):** Pré-Mirim (4–5), Mirim (6–7), Infantil A (8–9) e B (10–11), Infanto-Juvenil A (12–13) e B (14–15), Juvenil (16–17). Só de 4 a 17 anos. Ao criar categorias, marque as divisões e escolha "Feminino e masculino": nas lutas é criada uma categoria para cada peso da tabela (ex.: Juvenil Masculino – Galo, até 53,5 kg). O limite de baixo é o peso máximo da categoria anterior; quem pesa exatamente 53,5 kg fica no Galo. A tabela fica em Painel → Pontuação e regras e já vem com o Juvenil masculino e feminino.
- **Eventos e chaves:** categorias por divisão, sexo e peso (incluindo as adaptadas; parajiu-jítsu usa a tabela do jiu-jitsu se não tiver a própria). Elegibilidade automática. Eliminatória simples com BYEs, ou grupos seguidos de mata-mata cruzado.
- **Súmula:** os lances são registrados um a um e o placar é calculado na hora, com W.O., reabertura e avanço automático do vencedor. Nos coletivos há artilharia, cartões, sets e pênaltis.
- **Apresentações:** abertura, intervalo ou encerramento; ficha técnica; recursos de acessibilidade; roteiro de palco para imprimir ou baixar em CSV.
- **Calendário unificado:** detecção de conflitos (alertar ou impedir).
- **Equipes e equipe de apoio:** mesários, cronometristas, som e palco, fotografia.
- **Pontuação e regras:** todos os valores editáveis.
- **Site:** textos e contatos, notícias, projetos, patrocinadores e mensagens do formulário de contato. Fotos exigem descrição para leitores de tela.
- **Avisos aos inscritos:** para todos, para um perfil (ex.: só lutadores) ou para quem pratica uma modalidade.
- **Backup dos dados:** baixar e restaurar.

**Libras nas categorias:** ao criar uma categoria, o sistema monta sozinho uma explicação em frases simples, a partir das características escolhidas (modalidade, idade, sexo, peso, formato da chave, duração) e das regras de pontuação em vigor. Se as regras mudarem, a explicação muda junto. Na página da chave aparecem três opções:
- **Ver em Libras:** o avatar do VLibras, ferramenta oficial e gratuita do Governo Federal, sinaliza a explicação. Precisa de internet.
- **Ouvir explicação:** leitura em voz alta pelo navegador.
- **Vídeo com intérprete humano:** aparece quando houver.

No painel da categoria, **Baixar roteiro para intérprete** gera o texto para um intérprete gravar o vídeo oficial. Depois é só colar o link no campo "Vídeo com intérprete humano".

**Acessibilidade:** navegação por teclado (menus abrem com Enter e fecham com Esc), leitores de tela, alto contraste e tamanho de fonte, e vídeos em Libras em eventos, chaves, notícias e apresentações.

## Regras de pontuação

**Jiu-jitsu:** queda 2, raspagem 2, joelho na barriga 2, passagem 3, montada 4, costas 4. A finalização encerra a luta mesmo com o atleta atrás no placar. Desempate: pontos > vantagens > menos penalidades > árbitro. *Sequência crescente:* enquanto o atleta mantém o domínio, cada posição pontua uma vez; a sequência zera com "posição desfeita" ou quando o adversário pontua.

**Taekwondo:** soco no tronco 1, chute no tronco 2, chute na cabeça 3, giratório no tronco 4, giratório na cabeça 5 (configurável). Soco na cabeça não pontua e gera gam-jeom (+1 ao oponente). Há dois modos:
- *Soma dos rounds:* empate vai ao golden point. Diferença de 20 pontos, limite de gam-jeom ou RSC encerram a luta.
- *Melhor de 3:* opcional.

## Pontos que exigem decisão do cliente

1. Chute giratório na cabeça: 5 ou 6 pontos (hoje 5).
2. Sistema de rounds do taekwondo: soma com golden point, ou melhor de 3.
3. Tabela de peso das divisões Pré-Mirim a Infanto-Juvenil B e do taekwondo (só o Juvenil do jiu-jitsu veio preenchido), divisão por graduação/faixa.
4. Idade de referência: idade que o aluno completa no ano do evento, ou idade na data do evento.
5. Golpes proibidos por idade no jiu-jitsu infantil e escalonamento de penalidades.
6. Disputa de 3º lugar (hoje não existe).
7. Pontos na classificação dos coletivos; vôlei em melhor de 3 ou de 5 sets.
8. Conflito de horário: apenas alertar, ou impedir.
9. Revisão jurídica da política de privacidade e definição do encarregado (DPO).
10. Produção dos vídeos em Libras (o sistema recebe os links).
11. Se o site precisar receber inscrições pela internet, escolher um servidor ou serviço em nuvem (ver Limitação).

## Estrutura

```
index.html            página única; o JavaScript monta cada tela
css/site.css          visual (paleta vermelho, laranja e amarelo; contraste WCAG AA)
js/app.js             início do sistema e troca de páginas
js/data/local.js      armazenamento no navegador, login (PBKDF2), backup
js/data/seed.js       conteúdo inicial da Oásis (textos, projetos, notícias, eventos)
js/logic/scoring.js   regras de pontuação (jiu-jitsu, taekwondo, coletivos)
js/logic/brackets.js  geração de chaves
js/logic/calendar.js  conflitos de horário, idade, nomes abreviados
js/logic/services.js  regras do sistema (chaves, súmula, Central do evento)
js/pages/*.js         telas: público, cadastro, conta, painel, site
tests/*.test.js       testes automáticos das regras
```

## Testes

Os testes das regras de pontuação, chaves e calendário rodam com o Node.js (opcional, só para quem for mexer no código):

```
npm test
```

Resultado: **60 testes, 60 aprovados**. Também testei o sistema inteiro no navegador, simulando o uso:
- cadastro de alunos com responsável legal (e recusa sem responsável);
- professor encontrado na busca pública;
- evento, categoria, chave com BYE e súmula de taekwondo com avanço do vencedor;
- conflito palco × quadra na Central e na agenda do aluno;
- futsal com grupos, classificação, mata-mata, pênaltis e artilharia;
- dado sensível com auditoria;
- notícia com foto (descrição obrigatória);
- formulário de contato;
- backup e restauração depois de apagar o navegador;
- bloqueio do painel para alunos.

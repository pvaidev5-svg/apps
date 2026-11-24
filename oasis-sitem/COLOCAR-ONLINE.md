# Colocar o site online (todos veem os mesmos dados)

Hoje, se você manda os arquivos para outra pessoa, cada computador vira um site separado, com dados próprios.
Para todos verem as mesmas inscrições, chaves e resultados:

- **os dados** passam a ficar num banco de dados online gratuito do Google (Firebase);
- **o site** fica num endereço na internet (Netlify, também gratuito).

Depois disso, você **manda o link para as pessoas, e não os arquivos**.

Leva uns 20 minutos e só precisa ser feito uma vez. Você precisa de uma conta Google (Gmail).

---

## Parte 1: criar o banco de dados (Firebase)

### 1. Criar o projeto
1. Acesse **https://console.firebase.google.com** e entre com sua conta Google.
2. Clique em **Criar um projeto** (ou "Adicionar projeto"). Dê um nome, por exemplo `oasis-competicoes`.
3. O Google Analytics não é necessário: pode desativar. Conclua.

### 2. Ativar o login por e-mail e senha
1. No menu da esquerda: **Criação (Build) → Authentication → Vamos começar**.
2. Na aba **Método de login**, escolha **E-mail/senha**, ative a primeira opção e **Salve**.
3. **Importante, faça já:** na aba **Usuários**, clique em **Adicionar usuário** e crie a conta da coordenação:
   - E-mail: `adm@gmail.com`
   - Senha: `67676767`

   Assim ninguém mais consegue se cadastrar com esse e-mail.

### 3. Criar o banco de dados
1. No menu da esquerda: **Criação (Build) → Firestore Database → Criar banco de dados**.
2. Local: escolha **southamerica-east1 (São Paulo)**. Assim os dados ficam no Brasil.
3. Escolha **modo de produção** e conclua.
4. Abra a aba **Regras**, apague tudo e cole o conteúdo do arquivo **`firestore.rules`** que está nesta pasta. Clique em **Publicar**.
   As regras garantem que:
   - cada pessoa só veja o próprio cadastro;
   - os dados de deficiência só sejam vistos pela própria pessoa e pela coordenação;
   - só a coordenação altere eventos, chaves e resultados.

### 4. Ligar o site ao banco
1. Clique na engrenagem ⚙️ ao lado de "Visão geral do projeto" e vá em **Configurações do projeto**.
2. Em **Seus apps**, clique no ícone **`</>`** (Web). Dê um apelido (ex.: `site`) e clique em **Registrar app**. Não precisa marcar o Firebase Hosting.
3. Aparece um código com `const firebaseConfig = { apiKey: ..., authDomain: ..., ... }`.
4. Abra o arquivo **`js/firebase-config.js`** desta pasta (pode ser no VS Code ou no Bloco de Notas).
5. Troque a última linha, `window.OASIS_FIREBASE = null;`, pelos dados do seu projeto, assim:

```js
window.OASIS_FIREBASE = {
  apiKey: "AIza....",
  authDomain: "oasis-competicoes.firebaseapp.com",
  projectId: "oasis-competicoes",
  storageBucket: "oasis-competicoes.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

Salve o arquivo. Esses dados não são senha: podem ficar no site, porque quem protege o banco são as regras do passo 3.

---

## Parte 2: colocar o site na internet (Netlify)

1. Acesse **https://app.netlify.com/drop**.
2. **Arraste a pasta `oasis-site` inteira** para a área indicada na página.
3. Em segundos aparece um endereço terminado em `.netlify.app`.
4. **Crie a conta gratuita no Netlify, ou entre nela, e "reivindique" (claim) o site.** Sem isso, o site é apagado em pouco tempo.
5. Se quiser um nome melhor, dá para trocar o endereço em **Site configuration → Change site name** (ex.: `oasis-competicoes.netlify.app`).

### Liberar o endereço no Firebase
No Firebase: **Authentication → Configurações → Domínios autorizados → Adicionar domínio**. Cole o endereço do site, sem `https://` (ex.: `oasis-competicoes.netlify.app`).

---

## Parte 3: primeiro acesso

1. Abra o endereço do site e clique em **Já sou inscrito**. Entre com `adm@gmail.com` / `67676767`.
2. No primeiro acesso, o site grava sozinho o conteúdo inicial: textos, projetos, notícias e regras.
3. **Troque a senha da coordenação na hora:** Painel → Trocar senha.
4. Mande **o link do site** para os alunos, responsáveis e professores. Cada um se cadastra pelo link, e tudo aparece para você no painel.

### Dados que já estavam num computador
Se alguém já tinha cadastrado coisas no modo local:
1. Abra o site antigo nesse computador, entre como coordenação e vá em **Painel → Backup dos dados → Baixar backup**.
2. No site online, vá em **Painel → Backup dos dados → Restaurar** e escolha esse arquivo.

Os logins não vão junto: cada pessoa precisa se cadastrar de novo pelo link.

---

## Como mudar o site depois
Sempre que receber uma versão nova dos arquivos:
1. Copie para a pasta nova o seu `js/firebase-config.js`, que já está preenchido.
2. No Netlify, abra o site, vá em **Deploys** e arraste a pasta atualizada para a área do final da página.

Os dados não mudam: eles ficam no Firebase, não nos arquivos.

## Diferenças do modo online
- **Esqueceu a senha:** em Painel → Pessoas → (pessoa), o botão **Enviar e-mail para criar nova senha** manda um link para o e-mail da pessoa. No modo online não existe mais a senha provisória.
- **Excluir cadastro (LGPD):** a pessoa fica desativada e não consegue mais entrar. Para apagar o login de vez, vá em Firebase → Authentication → Usuários.
- **Plano gratuito:** o plano gratuito do Firebase (Spark) tem limite diário de leituras e gravações. Para uma instituição do tamanho da Oásis ele costuma bastar. Se um dia o limite for atingido, o site para de carregar até o dia seguinte. No console do Firebase dá para acompanhar o uso em **Firestore → Uso**.
- **Privacidade:** os dados passam a ficar nos servidores do Google, no Brasil se você escolheu São Paulo. Vale citar isso na política de privacidade do site: Painel → Site.

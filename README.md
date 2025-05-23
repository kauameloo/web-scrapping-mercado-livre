# Bot de Ofertas Mercado Livre para Telegram e WhatsApp

Este projeto é um bot que recebe links de produtos do Mercado Livre via Telegram, faz scraping das informações do produto (nome, preço, desconto, imagem) e envia uma mensagem formatada tanto no Telegram quanto em um grupo do WhatsApp.

## Tecnologias Utilizadas

- **Node.js**: Plataforma principal para execução do projeto.
- **node-telegram-bot-api**: Biblioteca para integração com a API do Telegram.
- **whatsapp-web.js**: Biblioteca para integração com o WhatsApp Web.
- **cheerio**: Biblioteca para manipulação e scraping de HTML.
- **axios**: Cliente HTTP para requisições web.
- **dotenv**: Gerenciamento de variáveis de ambiente.
- **qrcode-terminal**: Exibe QR Code no terminal para autenticação do WhatsApp.

## Pré-requisitos

- Node.js instalado (versão 14 ou superior recomendada)
- Conta no Telegram e no WhatsApp
- Grupo no WhatsApp (você precisa ser administrador para obter o ID)

## Instalação

1. **Clone o repositório:**

   ```
   git clone <url-do-repositorio>
   cd teste
   ```

2. **Instale as dependências:**

   ```
   npm install
   ```

3. **Configure as variáveis de ambiente:**

   - Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:
     ```
     TELEGRAM_TOKEN=SEU_TOKEN_DO_TELEGRAM
     WHATSAPP_GROUP_ID=ID_DO_GRUPO_WHATSAPP
     ```
   - Substitua `SEU_TOKEN_DO_TELEGRAM` pelo token do seu bot do Telegram.
   - Substitua `ID_DO_GRUPO_WHATSAPP` pelo ID do grupo do WhatsApp (veja abaixo como obter).

4. **Obtenha o ID do grupo do WhatsApp:**
   - **Importante:** Para obter o ID do grupo, um número diferente do que está rodando o bot deve enviar a mensagem `!grupo` no grupo desejado.
   - O ID do grupo será exibido no terminal onde o bot está rodando.

## Como Rodar

1. **Inicie o bot:**

   ```
   node index.js
   ```

2. **Autentique no WhatsApp:**

   - No primeiro uso, será exibido um QR Code no terminal.
   - Escaneie o QR Code com o WhatsApp Web do seu celular.

3. **Utilize o bot:**
   - No Telegram, envie **diretamente** um link de produto do Mercado Livre **(precisa ser o link de afiliado)** para o bot.
   - O bot irá extrair as informações do produto e enviar uma mensagem formatada no Telegram e no grupo do WhatsApp configurado.

## Como Funciona

- O bot escuta mensagens recebidas no Telegram.
- Quando detecta um link do Mercado Livre, faz scraping da página para obter título, preço, preço original, desconto e imagem.
- Monta uma mensagem personalizada para o Telegram (com Markdown) e para o WhatsApp (texto puro).
- Envia as mensagens para o chat do Telegram e para o grupo do WhatsApp.

## Observações

- O arquivo `.env` **NÃO** deve ser versionado (já está no `.gitignore`).
- O scraping pode falhar se o Mercado Livre alterar o layout da página.
- O bot só envia para o grupo do WhatsApp se o ID estiver corretamente configurado.

## Dependências

Veja todas as dependências no `package.json`. As principais são:

- node-telegram-bot-api
- whatsapp-web.js
- cheerio
- axios
- dotenv
- qrcode-terminal

## Licença

Este projeto é apenas para fins educacionais.

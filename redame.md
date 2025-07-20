🛠️ App de Pedidos por WhatsApp con integración a AppSheet

Esta app permite gestionar pedidos por WhatsApp y guardar la información en AppSheet.

📦 Requisitos

Node.js >= 16

Cuenta de Twilio con número de WhatsApp habilitado

App creada en AppSheet con las siguientes tablas:

Productos

Pedido

enc_pedido

📁 Archivos principales

index.js → lógica del bot y conexión con AppSheet

start.js → punto de entrada para producción

.env → contiene las variables sensibles

⚙️ Variables de entorno

Crea un archivo .env con el siguiente contenido:

PORT=3000

# AppSheet API
APPSHEET_API_KEY=TU_API_KEY
APPSHEET_BASE_URL=https://api.appsheet.com/api/v2/apps/TU_APP_ID/tables

# Twilio
TWILIO_ACCOUNT_SID=TU_SID
TWILIO_AUTH_TOKEN=TU_TOKEN
TWILIO_PHONE_NUMBER=whatsapp:+57XXXXXXXXXX

🚀 Ejecutar en local

npm install
npx nodemon start.js

Asegúrate de que tu servidor esté accesible por internet usando ngrok:

npx ngrok http 3000

Configura la URL pública de ngrok como webhook en tu consola de Twilio.

☁️ Despliegue en Render

Sube este repositorio a GitHub.

Ve a Render → "New Web Service"

Conecta tu cuenta de GitHub y selecciona el repositorio.

Configura:

Build Command: npm install

Start Command: node start.js

Environment: Node

Root Directory: (vacío si tu index.js está en la raíz)

Variables de entorno: copia desde tu .env

Dale Deploy.

✅ Flujo resumido

Usuario escribe "hola"

El bot saluda y da opción: 1. Pedido, 2. Fin

Si elige "Pedido":

Pide nombre, dirección y celular

Pide productos uno por uno hasta que escriba "fin"

Busca coincidencias en AppSheet

Pide presentación si hay más de una

Pide cantidad

Muestra resumen del producto

Cuando escribe "fin":

Guarda los productos en Pedido

Guarda encabezado en enc_pedido

Muestra resumen completo
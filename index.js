require('dotenv').config();
const { createBot, createFlow, MemoryDB, createProvider } = require('@bot-whatsapp/bot');
const { TwilioProvider } = require('@bot-whatsapp/provider-twilio');
const { addClient, addPedidoDetalle, addEncabezado, getProductosByNombre } = require('./appsheet-client');
const { v4: uuidv4 } = require('uuid');

const provider = createProvider(TwilioProvider, {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
});

const db = new MemoryDB();

const state = {}; // Guardar estado por número

const flow = createFlow([
  {
    keyword: ['hola', 'Hola'],
    async action(ctx, { flowDynamic, state: st }) {
      state[ctx.from] = { step: 'menu', pedido: [], enc: {} };
      await flowDynamic('👋 ¡Hola! ¿Qué deseas hacer?\n1. Pedido\n2. Fin');
    },
  },
  {
    keyword: ['1', 'pedido', 'Pedido'],
    async action(ctx, { flowDynamic }) {
      state[ctx.from] = {
        step: 'nombre_cliente', pedido: [], enc: { pedidoid: uuidv4(), fecha: new Date().toISOString() }
      };
      await flowDynamic('📝 Empecemos tu pedido. ¿Cuál es tu nombre?');
    },
  },
  {
    keyword: ['2', 'fin', 'Fin'],
    async action(ctx, { flowDynamic }) {
      state[ctx.from] = null;
      await flowDynamic('✅ Conversación finalizada. ¡Gracias!');
    },
  },
  {
    fallback: true,
    async action(ctx, { flowDynamic }) {
      const userState = state[ctx.from];
      if (!userState) return;

      switch (userState.step) {
        case 'nombre_cliente':
          userState.enc.cliente = ctx.body;
          userState.step = 'direccion';
          await flowDynamic('📍 ¿Cuál es tu dirección?');
          break;

        case 'direccion':
          userState.enc.direccion = ctx.body;
          userState.step = 'celular';
          await flowDynamic('📱 ¿Cuál es tu celular?');
          break;

        case 'celular':
          userState.enc.celular = ctx.body;
          userState.step = 'producto';
          await flowDynamic('🛒 Escribe el nombre del producto (escribe "fin" para terminar):');
          break;

        case 'producto':
          if (ctx.body.toLowerCase() === 'fin') {
            const resumen = userState.pedido.map(p =>
              `${p.nombreProducto} x${p.cantidadProducto} - $${p.valor} ($${p.valor_unit})`
            ).join('\n');
            const enc_total = userState.pedido.reduce((acc, p) => acc + p.valor, 0);
            userState.enc.enc_total = enc_total;
            await addClient(userState.enc);
            for (const prod of userState.pedido) {
              await addPedidoDetalle({ ...prod, pedidoid: userState.enc.pedidoid, fecha: userState.enc.fecha });
            }
            await flowDynamic(`🧾 Resumen del pedido:\nCliente: ${userState.enc.cliente}\n${resumen}\n💰 Total: $${enc_total}`);
            state[ctx.from] = null;
            break;
          }

          const productos = await getProductosByNombre(ctx.body);
          if (productos.length === 0) {
            await flowDynamic('❌ Producto no encontrado. Intenta de nuevo.');
          } else if (productos.length === 1) {
            userState.productoSeleccionado = productos[0];
            userState.step = 'cantidad';
            await flowDynamic(`💲 ${productos[0].NombreProducto} cuesta $${productos[0].Valor}. ¿Qué cantidad deseas?`);
          } else {
            userState.step = 'elegir_presentacion';
            userState.productoOpciones = productos;
            const opciones = productos.map((p, i) => `${i + 1}. ${p.NombreProducto} - $${p.Valor}`).join('\n');
            await flowDynamic(`📦 Hay varias presentaciones:\n${opciones}\nElige el número que deseas:`);
          }
          break;

        case 'elegir_presentacion': {
          const i = parseInt(ctx.body) - 1;
          const seleccion = userState.productoOpciones[i];
          if (seleccion) {
            userState.productoSeleccionado = seleccion;
            userState.step = 'cantidad';
            await flowDynamic(`💲 Elegiste: ${seleccion.NombreProducto} ($${seleccion.Valor})\n¿Cuántos deseas?`);
          } else {
            await flowDynamic('❌ Selección inválida. Intenta de nuevo.');
          }
          break;
        }

        case 'cantidad': {
          const cant = parseInt(ctx.body);
          if (isNaN(cant) || cant <= 0) {
            await flowDynamic('❌ Cantidad inválida. Intenta de nuevo.');
            return;
          }
          const prod = userState.productoSeleccionado;
          const valor = cant * parseFloat(prod.Valor);
          userState.pedido.push({
            nombreProducto: prod.NombreProducto,
            cantidadProducto: cant,
            valor_unit: parseFloat(prod.Valor),
            valor
          });
          userState.step = 'producto';
          await flowDynamic(`✅ Agregado: ${prod.NombreProducto} x${cant} = $${valor}\nAgrega otro producto o escribe "fin".`);
          break;
        }

        default:
          await flowDynamic('❓ No entendí. Escribe "hola" para comenzar.');
      }
    },
  },
]);

const main = async () => {
  await createBot({
    flow,
    provider,
    database: db,
  });
};

main();

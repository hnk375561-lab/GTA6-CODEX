const fetch = require('node-fetch');

const token = process.env.CLOUDFLARE_TOKEN;
if (!token) {
  console.error('❌ Falta: CLOUDFLARE_TOKEN');
  process.exit(1);
}

const domain = 'sinfrenos.santicefe04.workers.dev';
const api = 'https://api.cloudflare.com/client/v4';

async function getZoneId() {
  console.log('🔍 Buscando zona...');
  const res = await fetch(`${api}/zones?name=workers.dev`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = await res.json();
  if (!data.success || !data.result.length) {
    console.error('❌ No encontré la zona workers.dev');
    return null;
  }
  
  return data.result[0].id;
}

async function setupRateLimit(zoneId) {
  console.log('⚙️ Configurando rate limit...');
  
  const config = {
    threshold: 50,        // 50 requests
    period: 10,           // en 10 segundos
    match: {
      request: {
        url: { path_contains: '/' }
      }
    },
    action: 'block',
    description: 'Block bots - 50 req per 10 sec'
  };

  const res = await fetch(`${api}/zones/${zoneId}/rate_limits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });

  const data = await res.json();
  if (data.success) {
    console.log('✅ Rate limit configurado');
  } else {
    console.error('⚠️ Error en rate limit:', data.errors);
  }
}

async function main() {
  const zoneId = await getZoneId();
  if (!zoneId) return;
  
  await setupRateLimit(zoneId);
  console.log('✨ Listo!');
}

main().catch(console.error);

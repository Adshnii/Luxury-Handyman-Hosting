import { connect } from 'cloudflare:sockets';

// Public compatibility probe only. No credentials, AUTH, MAIL, RCPT or DATA.
export default {
  async fetch(request) {
    if (new URL(request.url).pathname !== '/smtp-check') {
      return new Response('Open /smtp-check for a no-login SMTP compatibility check. No email will be sent.');
    }
    const report = { host: 'mail.spacemail.com', port: 465, credentialsUsed: false, emailSent: false };
    let socket, timer;
    try {
      socket = connect({ hostname: report.host, port: report.port }, { secureTransport: 'on' });
      socket.closed.catch(() => {});
      const result = await Promise.race([
        (async () => {
          await socket.opened;
          report.tlsConnected = true;
          const reader = socket.readable.getReader();
          const writer = socket.writable.getWriter();
          const encoder = new TextEncoder(), decoder = new TextDecoder();
          let buffer = '';
          async function response() {
            let lines = [];
            while (true) {
              let pos;
              while ((pos = buffer.indexOf('\r\n')) !== -1) {
                const line = buffer.slice(0, pos); buffer = buffer.slice(pos + 2);
                lines.push(line);
                if (/^\d{3} /.test(line)) return lines;
              }
              const part = await reader.read();
              if (part.done) throw new Error('SMTP closed before final reply');
              buffer += decoder.decode(part.value, { stream: true });
              if (buffer.length > 16384) throw new Error('SMTP response too large');
            }
          }
          report.greeting = await response();
          if (!report.greeting.at(-1).startsWith('220 ')) throw new Error('SMTP greeting not ready');
          await writer.write(encoder.encode('EHLO luxuryhandymansolvix.com\r\n'));
          report.ehlo = await response();
          if (!report.ehlo.at(-1).startsWith('250 ')) throw new Error('EHLO rejected');
          await writer.write(encoder.encode('QUIT\r\n'));
          report.quit = await response();
          return { ...report, protocolCompatible: true };
        })(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('SMTP check timed out after 15 seconds')), 15000); }),
      ]);
      return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return Response.json({ ...report, protocolCompatible: false, error: error.message }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    } finally {
      clearTimeout(timer);
      if (socket) await socket.close().catch(() => {});
    }
  }
};

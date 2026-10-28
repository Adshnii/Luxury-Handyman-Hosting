import http from 'node:http';
import nodemailer from 'nodemailer';
import { createHandler, MAILBOX } from './contact.mjs';

if (!process.env.SMTP_PASSWORD) throw new Error('Configure SMTP_PASSWORD in server secrets before starting');
const transport = nodemailer.createTransport({
  host: 'mail.spacemail.com', port: 465, secure: true,
  auth: { user: MAILBOX, pass: process.env.SMTP_PASSWORD },
  tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
  disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
});
const server = http.createServer(createHandler({ sendMail: message => transport.sendMail(message) }));
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT || 3000), process.env.BIND_ADDRESS || '127.0.0.1');

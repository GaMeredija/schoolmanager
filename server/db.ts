import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from "../shared/schema";
import path from 'path';
import { fileURLToPath } from 'url';

// Garantir que o banco usado pelo Drizzle/libsql seja o mesmo do restante do servidor: server/school.db
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'school.db');

const client = createClient({
  // Usar caminho absoluto para evitar cair no school.db da raiz
  url: `file:${dbPath}`,
});

// Ativar logger do Drizzle para inspecionar SQL executado (ajuda a depurar erros "near =")
export const db = drizzle(client, { schema, logger: true });
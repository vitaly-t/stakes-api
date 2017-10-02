import * as pgpModule from 'pg-promise';
import {db as config} from '../config';
import { BaseLogger } from 'pino';
import * as debugModule from 'debug';

const debug = debugModule('services:db');

const pgp = pgpModule({});
export const db = pgp(config.url);
export const helpers = pgp.helpers;

export async function query(logger : BaseLogger, queryName: string, query : string, args? : any) : Promise<any[]> {
  debug("SQL query", { query, args });
  let start = Date.now();
  let result = await db.query(query, args);
  logger.info({args}, "SQL query %s took %d ms", queryName, Date.now() - start);
  return result;
}

import * as pgpModule from 'pg-promise';
import {db as config} from '../config';
import { BaseLogger } from 'pino';
import * as debugModule from 'debug';

const debug = debugModule('services:db');

const pgp = pgpModule({});
export const pg = pgp(config.url);
export const helpers = pgp.helpers;
export const as = pgp.as;

export async function query(logger: BaseLogger, queryName: string, query: string, args?: any, tx: pgpModule.IDatabase<any> | pgpModule.ITask<any> = pg) : Promise<any[]> {
  debug("SQL query", { queryName, query, args });
  let start = Date.now();
  let result = await tx.query(query, args);
  logger.info({args}, "SQL query %s took %d ms", queryName, Date.now() - start);
  return result;
}
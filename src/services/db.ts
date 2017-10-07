import * as pgpModule from 'pg-promise';
import {db as config} from '../config';
import { BaseLogger } from 'pino';
import * as debugModule from 'debug';

const debug = debugModule('services:db');

const pgp = pgpModule({});
export const pg = pgp(config.url);
export const helpers = pgp.helpers;

export async function queryTx(logger : BaseLogger, queryName: string, tx : pgpModule.IDatabase<any> | pgpModule.ITask<any>, query : string, args? : any) : Promise<any[]> {
  debug("SQL query", { queryName, query, args });
  let start = Date.now();
  let result = await tx.query(query, args);
  logger.info({args}, "SQL query %s took %d ms", queryName, Date.now() - start);
  return result;
}

export function query(logger: BaseLogger, queryName: string, query: string, args?: any) {
  return queryTx(logger, queryName, pg, query, args);
}
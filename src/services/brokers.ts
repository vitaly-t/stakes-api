import { brokerage_server as config } from '../config';
import { Request } from '../types';
import { BaseLogger } from 'pino';
import * as request from 'request-promise';
import * as db from './db';

export interface Execution {
  id: string;
  type: string;
  strike: number;
  expiration: string;
  multiplier: string;
  exchange: string;
  side: string;
  size: number;
  price: number;
  commissions: number;
  realized_pnl: number;
  time: string;
};

export interface Trade {
  account: string;
  broker: string;
  id: string;
  symbol: string;
  time: string;
  executions: Execution[];
}

function doRequest(logger : BaseLogger, url : string, method : string ="GET", body? : object) {
  return request({
    url,
    baseUrl: config.url,
    method,
    json: true,
    body,
  })
  .then((r) => r.data);
}

export async function getTrades(req : Request, retrieveAll : boolean) : Promise<Trade[]> {
  let since;
  let url = '/trades';
  if(!retrieveAll) {
    let latest = await db.query(req.log, 'get last trades fetch time', `SELECT ts FROM fetches WHERE user_id=$[user_id] AND type='trades`, { user_id: req.user.id });
    if(latest.length) {
      url += `?start=${latest[0].ts.toISOString()}`;
    }
  }

  let now = new Date();

  let fetchLog = db.query(req.log, 'log fetch', `INSERT INTO fetches (user_id, type, ts) VALUES ($[user_id], 'trades', $[now])`,
    { user_id: req.user.id, now });
  let trades = doRequest(req.log, url);
  return Promise.all([ trades, fetchLog ])[0];
}

export function getPositions(req : Request) {
  let fetchLog = db.query(req.log, 'log fetch', `INSERT INTO fetches (user_id, type) VALUES ($[user_id], 'positions')`,
    { user_id: req.user.id });
  let positions = doRequest(req.log, '/positions');

  return Promise.all([ positions, fetchLog ])[0];
}
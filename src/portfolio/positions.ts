import * as db from '../services/db';
import * as debugMod from 'debug';
import { BaseLogger } from 'pino';
import { Request } from '../types';

const debug = debugMod('positions');

export interface Position {
  id : string;
  user_id: string;
  symbol: string;
  name: string;
  note: string;
  broker: string;
  active: boolean;
  added: Date;
}

export type PartialPosition = {
  [P in keyof Position]? : Position[P];
}

const columns = new db.helpers.ColumnSet(
  [ 'id', 'user_id', 'symbol', 'name', 'note', 'broker', 'active', 'added' ],
  {
    table: 'positions',
  }
);

export function add(req: Request, data : Position) {
  let q = db.helpers.insert(data, columns) + ' RETURNING id';
  return db.query(req.log, 'add position', q);
}

export function update(req : Request, id : string, data : PartialPosition) {
  let q = db.helpers.update(data, columns);
  q += ` WHERE id=$[id] AND user_id=$[user_id]
    RETURNING *
  `;
  return db.query(req.log, 'update position', q, [id, req.user.id]);
}

export function remove(req : Request, id : string) {
  let q = `DELETE FROM positions
    WHERE id=$[id] AND user_id=$[user_id]
    RETURNING id`;
  return db.query(req.log, 'remove position', q, { id, user_id: req.user.id });
}


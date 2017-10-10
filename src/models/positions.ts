import * as _ from 'lodash';
import * as db from '../services/db';
import * as debugMod from 'debug';
import { BaseLogger } from 'pino';
import { Request } from '../types';
import * as optionlegs from './optionlegs';
import * as models from '../common/models';

const debug = debugMod('positions');

const Column = models.Column;

export class Position {
  @Column({ readonly: true })
  id : string;

  @Column({ readonly: true })
  user_id: string;

  @Column()
  account: string;

  @Column({ required: true })
  symbol: string;

  @Column({ required: true })
  name: string;

  @Column()
  note: string;

  @Column()
  active: boolean;

  @Column({ readonly: true, jsonSchemaType: 'number' })
  tags : number[];

  @Column({ readonly: true })
  added: Date;

  @Column({ readonly: true })
  latest_trade: Date;
}

const { accessors: preMadeAccessors, schema } = models.makeAllData(Position, 'positions');
export { schema };

export interface GetOptions {
  id?: string | string[];
  symbol? : string;
  tags?: number[];
  active?: boolean;
  includeTrades?: boolean;
  minDate? : Date;
  maxDate? : Date;
}

export const accessors = {
  get: (req: Request, options : GetOptions = {}) => {
    let wheres = ['user_id=$[user_id]'];
    let args : any = {
      user_id: req.user.id,
    };

    if(options.id) {
      args.id = options.id;
      if(_.isArray(options.id)) {
        wheres.push('id = ANY($[id]');
      } else {
        wheres.push('id=$[id]');
      }
    }

    if(options.tags) {
      args.tags = options.tags;
      wheres.push('tags && $[tags]');
    }

    if(_.has(options, 'active')) {
      args.active = Boolean(options.active);
      wheres.push('active=$[active]');
    }

    if(options.minDate) {
      args.minDate = options.minDate;
      wheres.push('added >= $[minDate]');
    }

    if(options.maxDate) {
      args.maxDate = options.maxDate;
      wheres.push('latest_trade <= $[maxDate]');
    }

    let query = `SELECT p.id, p.account, p.symbol, p.name, p.tags, p.note, p.active, p.added, p.latest_trade, p.tags
      FROM positions p
      WHERE ${wheres.join(' AND ')}`;

    if(options.includeTrades) {
      // Get all trades and legs.
      query = `
      WITH positions AS (
        ${query}
      ),
      matching_trades AS (
        SELECT t.id,
          max(t.position) position,
          max(t.name) name,
          max(t.note) note,
          max(t.size) size,
          max(t.price) price,
          max(t.multiplier) multiplier,
          max(t.commissions) commissions,
          max(t.notional_risk) notional_risk,
          max(t.traded) traded,
          json_agg(json_build_object(${optionlegs.jsonObjectSyntax})) opened_legs
        FROM trades t
        JOIN positions p ON p.id=t.position
        LEFT JOIN optionlegs ol ON ol.opening_trade=t.id
        GROUP BY t.id
      ),
      trades_agg AS (
        SELECT position,
          json_agg(json_build_object(
            'id', t.id,
            'name', t.name,
            'note', t.note,
            'size', t.size,
            'price', t.price,
            'multiplier', t.multiplier,
            'comissions', t.commissions,
            'notional_risk', t.notional_risk,
            'traded', t.traded,
            'opened_legs', t.opened_legs
          )) trades
          FROM matching_trades
          JOIN positions on positions.id=trades.position
          GROUP BY position
      )
      SELECT positions.*, t.trades
      FROM positions
      JOIN trades_agg t on positions.id=t.position
      ORDER BY added DESC`;
    } else {
      query = query + '\nORDER BY added DESC';
    }

    return db.query(req.log, 'search positions', query, args);
  },

  addTag: (req : Request, id : string, tag : number | number[]) => {
    if(!_.isArray(tag)) {
      tag = [tag];
    }

    let query = `UPDATE positions SET tags = tags || $[tag]
        WHERE id=$[id] AND user_id=$[user_id]) AND NOT (tags && $[tag])
        RETURNING id`;
    return db.query(req.log, 'add tag', query, { id, tag, user_id: req.user.id });
  },

  removeTag: (req: Request, id: string, tag: number) => {
    const query = `UPDATE positions SET tags = array_remove(tags, $[tag])
      WHERE id=$[id] AND user_id=$[user_id]
      RETURNING id`;
    return db.query(req.log, 'remove tag', query, { id, tag, user_id: req.user.id });
  },

  ...preMadeAccessors,
};

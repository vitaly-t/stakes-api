import * as _ from 'lodash';
import * as db from '../services/db';
import * as debugMod from 'debug';
import { BaseLogger } from 'pino';
import { Request } from '../types';
import { Trade, ITrade } from './trades';
import * as models from './models';
import joinMonster from 'join-monster';

import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
} from '../graphql';

export interface IPosition {
  id: string;
  user_id: string;
  account: string;
  symbol: string;
  name: string;
  note: string;
  tags: number[];
  notional_risk: string;
  profit_target_pct: number;
  stop_loss: number;
  active: boolean;
  added: string;

  trades? : ITrade[];
}

export const Position = new GraphQLObjectType({
  name: 'Position',
  sqlTable: 'positions',
  uniqueKey: 'id',
  fields: {
    id: { type: GraphQLString },
    user_id: { type: GraphQLString },
    account: { type: new GraphQLNonNull(GraphQLString) },
    symbol: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: GraphQLString },
    note: { type: GraphQLString },
    tags: {  type: new GraphQLList(GraphQLInt) },
    notional_risk: { type: GraphQLFloat },
    profit_target_pct: { type: GraphQLFloat },
    stop_loss: { type: GraphQLFloat },
    active: { type: GraphQLBoolean },
    added: { type: GraphQLString },

    trades: {
      type: new GraphQLList(Trade),
      sqlJoin(positionTable, tradesTable) {
        return `${positionTable}.id = ${tradesTable}.position`;
      }
    },
  },
});

export const rootQueryFields = {
  position: {
    type: Position,
    args: {
      id: { type: GraphQLID },
      symbol: { type: GraphQLString },
      tags : { type : new GraphQLList(GraphQLInt) },
      active: { type: GraphQLBoolean },
      minDate: { type: GraphQLString },
      maxDate: { type: GraphQLString },
    },
    where: (table, args, context) => {
      let wheres = [`${table}.user_id='${context.user.id}`];

      if(args.id) {
        wheres.push(`${table}.id=${db.as.text(args.id)}`);
      }

      if(args.tags) {
        wheres.push(`${table}.tags && ${db.as.array(args.tags)}`);
      }

      if(_.has(args, 'active')) {
        wheres.push(`${table}.active=${db.as.bool(args.active)}`);
      }

      if(args.minDate) {
        let x = new Date(args.minDate);
        if(!x) { throw new Error("invalid value for minDate"); }
        wheres.push(`${table}.added >= ${db.as.date(x)}`);
      }

      if(args.maxDate) {
        let x = new Date(args.maxDate);
        if(!x) { throw new Error("invalid value for maxDate"); }
        wheres.push(`${table}.added <= ${db.as.date(x)}`);
      }

      return wheres.join(' AND ');
    },
    resolve: (parent, args, context, resolveInfo) => {
      return joinMonster(resolveInfo, context, sql => {
        return db.query(context.log, 'get positions', sql, context.sqlArgs);
      })
    },
  },
};

const { accessors: preMadeAccessors } = models.makeAllData(Position, 'positions');

export const accessors = {
  ...preMadeAccessors,

  addTag: (req : Request, id : string, tag : number | number[]) => {
    if(!_.isArray(tag)) {
      tag = [tag];
    }

    let query = `UPDATE positions SET tags = tags || $[tag]
        WHERE id=$[id] AND user_id=$[user_id]) AND NOT (tags && $[tag])
        RETURNING id, tags`;
    return db.query(req.log, 'add tag', query, { id, tag, user_id: req.user.id });
  },

  removeTag: (req: Request, id: string, tag: number) => {
    const query = `UPDATE positions SET tags = array_remove(tags, $[tag])
      WHERE id=$[id] AND user_id=$[user_id]
      RETURNING id, tags`;
    return db.query(req.log, 'remove tag', query, { id, tag, user_id: req.user.id });
  },

  setTags: (req: Request, id: string, tags: number[]) => {
    const query = `UPDATE positions SET tags = $[tags]
      WHERE id=$[id] AND user_id=$[user_id]
      RETURNING id, tags`;
    return db.query(req.log, 'remove tag', query, { id, tags, user_id: req.user.id });
  },

};

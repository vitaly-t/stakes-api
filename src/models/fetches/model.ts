import * as _ from 'lodash';
import * as db from '../../services/db';
import * as debugMod from 'debug';
import { BaseLogger } from 'pino';
import { Request } from '../../types';
import * as models from '../models';
import joinMonster from 'join-monster';

import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLFloat,
} from '../../graphql_types';

export interface IFetch {
  id: string;
  user_id: string;
  type: string;
  status: string;
  items_fetched: number;
  ts: Date;
}

export const Fetch = new GraphQLObjectType({
  name: 'Fetch',
  sqlTable: 'fetches',
  uniqueKey: ['user_id', 'type', 'ts'],
  fields: {
    id: { type: GraphQLString },
    type: { type: GraphQLString },
    status: { type: GraphQLInt },
    items_fetched: { type: GraphQLInt },
    ts: { type: GraphQLString },
  },
});

export const rootQueryFields = {
  fetches: {
    type: Fetch,
    args: {
      type: { type: GraphQLString },
      status: { type: GraphQLString },
      min_timestamp: { type: GraphQLString },
    },
    where: (table, args, context) => {
      let wheres = [`${table}.user_id=${db.as.text(context.user.id)}`];
      if(args.type) {
        wheres.push(`${table}.type=${db.as.text(args.type)}`);
      }

      if(args.status) {
        wheres.push(`${table}.type=${db.as.text(args.status)}`);
      }

      if(args.min_timestamp) {
        let ts = new Date(args.min_timestamp);
        if(ts) {
          wheres.push(`${table}.type=${db.as.date(ts)}`);
        }
      }

      return wheres.join(' AND ');
    },
    resolve: (parent, args, context, resolveInfo) => {
      return joinMonster(resolveInfo, context, sql => {
        return db.query(context.log, 'get fetches', sql);
      });
    },
  },
};

export const accessors = models.makeAccessors<IFetch>(Fetch, 'fetches', ['id', 'user_id', 'type']);

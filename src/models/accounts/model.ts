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

export interface IAccount {
  id : string;
  user_id : string;
  broker : number;
  name: string;

  total_value: number;
  stock_bp: number;
  option_bp: number;

  should_autoupdate : boolean;
  last_pull_time : Date;
}

export const Account = new GraphQLObjectType({
  name: 'Account',
  sqlTable: 'accounts',
  uniqueKey: 'id',
  fields: {
    id: { type: GraphQLString },
    broker: { type: GraphQLInt },
    name: { type: GraphQLString },

    total_value: { type: GraphQLFloat },
    stock_bp: { type: GraphQLFloat },
    option_bp: { type: GraphQLFloat },

    should_autoupdate: { type: GraphQLBoolean },
    last_pull_time: { type: GraphQLString },
  },
});

export const rootQueryFields = {
  accounts: {
    type: Account,
    where: (table, args, context) => `${table}.user_id=${db.as.text(context.user.id)}`,
    resolve: (parent, args, context, resolveInfo) => {
      return joinMonster(resolveInfo, context, sql => {
        return db.query(context.log, 'get accounts', sql);
      });
    },
  },
};

const preMadeAccessors = models.makeAccessors<IAccount>(Account, 'accounts', ['id']);

export const accessors = {
  ...preMadeAccessors,
};

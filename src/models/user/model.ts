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
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
} from '../../graphql_types';

export interface IUser {
  id : string;
  email : string;
  name : string;
  pw_hash? : string;
  info: {[key: string]: any};
}

export const UserInfo = new GraphQLObjectType({
  name: 'UserInfo',
  fields: {},
});

export const User = new GraphQLObjectType({
  name: 'User',
  sqlTable: 'users',
  uniqueKey: 'id',
  fields: {
    id: { type: GraphQLID },
    email: { type: GraphQLString },
    name:  { type: GraphQLString },
    info: {
      type: UserInfo,
    },
  },
});

export const rootQueryFields = {
  user: {
    type: User,
    where: (table, args, context) => `${table}.id=${db.as.text(context.user.id)}`,
    resolve: (parent, args, context, resolveInfo) => {
      return joinMonster(resolveInfo, context, sql => {
        return db.query(context.log, 'get user', sql);
      });
    },
  },
};

const preMadeAccessors = models.makeAccessors<IUser>(User, 'users', ['id', 'pw_hash']);

export const accessors = {
  ...preMadeAccessors,
};

import * as _ from 'lodash';
import * as db from '../services/db';
import * as debugMod from 'debug';
import { BaseLogger } from 'pino';
import { Request } from '../types';
import * as models from './models';

import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
} from '../graphql';

export interface IUser {
  id : string;
  email : string;
  name : string;
  pw_hash? : string;
  info: {[key: string]: any};
}

export const UserInfo = new GraphQLObjectType({
  name: 'UserInfo',
  fields: () => ({}),
});

export const User = new GraphQLObjectType({
  name: 'User',
  sqlTable: 'users',
  uniqueKey: 'id',
  fields: () => ({
    id: { type: GraphQLID },
    email: { type: GraphQLString },
    name:  { type: GraphQLString },
    info: {
      type: UserInfo,
    },
  }),
});

export const rootQueryFields = {
  user: {
    type: User,
    where: (table, args, context) => `${table}.id=${db.as.text(context.user.id)}`,
  },
};

const preMadeAccessors = models.makeAccessors(User, 'users', ['id', 'pw_hash']);

export const accessors = {
  ...preMadeAccessors,
};

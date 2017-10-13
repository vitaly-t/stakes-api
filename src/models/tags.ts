import * as _ from 'lodash';
import * as db from '../services/db';
import * as debugMod from 'debug';
import { BaseLogger } from 'pino';
import { Request } from '../types';
import * as models from './models';

import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLFloat,
} from '../graphql';

export interface ITag {
  id : string;
  user_id : string;
  name: string;
  color: string;
}

export const Tag = new GraphQLObjectType({
  name: 'Tag',
  sqlTable: 'tags',
  uniqueKey: 'id',
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    color: { type: GraphQLString },
  }),
});

export const rootQueryFields = {
  tags: {
    type: Tag,
    where: (table, args, context) => `${table}.user_id=${db.as.text(context.user.id)}`,
  },
};

const preMadeAccessors = models.makeAccessors(Tag, 'tags', ['id']);

export const accessors = {
  ...preMadeAccessors,
}
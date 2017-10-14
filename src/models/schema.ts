import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { rootQueryFields as positions } from './positions';
import { rootQueryFields as tags } from './tags';
import { rootQueryFields as accounts } from './accounts';
import { rootQueryFields as users } from './user';
import { rootQueryFields as brokers } from './brokers';

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      ...positions,
      ...tags,
      ...accounts,
      ...brokers,
      ...users,
    }
  }),
  mutation: new GraphQLObjectType({
    name: 'RootMutationType',
    fields: {

    }
  })
});

export default schema;
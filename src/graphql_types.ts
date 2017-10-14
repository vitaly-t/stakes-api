import * as gq from 'graphql';

declare module 'graphql/type/definition' {
  export interface GraphQLObjectTypeConfig<TSource, TContext> {
    sqlTable?: string;
    uniqueKey?: string | string[];
  }
}

export = gq;

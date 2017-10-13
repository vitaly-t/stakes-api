import * as db from '../services/db';
import * as _ from 'lodash';
import { Request } from '../types';
import { GraphQLObjectType, GraphQLFieldMap, GraphQLList } from '../graphql';

export type I<T> = {
  [K in keyof T]: T[K];
}

function skipCol(col) {
  return col.value === undefined;
}

export function createColumnSet(fields: GraphQLFieldMap<any, any>, tableName: string, readonlyFields: string[]) {

  let columnDef = _.map(fields, (col, name) => {
    let val = {
      name: col.name,
      skip: skipCol,
      cnd: _.includes(readonlyFields, name),
    };
  });

  return new db.helpers.ColumnSet(columnDef, { table: tableName });
}

type Partial<T> = {
  [K in keyof T]?: T[K];
};

export function makeAccessors<T>(t: GraphQLObjectType, tableName: string, readonlyFields? : string[]) {
  type PartialT = Partial<T>;

  let fields = t.getFields();

  const columnSet = createColumnSet(fields, tableName, readonlyFields);

  const addQueryName = `add ${tableName}`;
  const updateQueryName = `update ${tableName}`;
  const deleteQueryName = `remove ${tableName}`
  const deleteQuery = `DELETE FROM ${tableName}
    WHERE id=$[id] AND user_id=$[user_id]
    RETURNING id`;

  const getByIdQuery = `SELECT * FROM ${tableName} WHERE id=$[id] AND user_id=$[user_id]`;
  const getByIdQueryName = `getbyid ${tableName}`;
  const getAllQuery = `SELECT * FROM ${tableName} WHERE user_id=$[user_id]`;
  const getAllQueryName = `get all ${tableName}`;

  return {
    add: function(req: Request, data: PartialT | PartialT[]) {
      let q = db.helpers.insert(data, columnSet) + ' RETURNING *';
      return db.query(req.log, addQueryName, q);
    },

    update: function(req: Request, id: string, data: PartialT) {
      let q = db.helpers.update(data, null, tableName);
      q += ` WHERE id=$[id] AND user_id=$[user_id]
      RETURNING *`;
      return db.query(req.log, updateQueryName, q, { id, user_id: req.user.id });
    },

    remove: function(req: Request, id: string) {
      return db.query(req.log, deleteQueryName, deleteQuery, { id, user_id: req.user.id });
    },

    getById: function(req: Request, id: string) {
      return db.query(req.log, getByIdQueryName, getByIdQuery, { id, user_id: req.user.id });
    },

    getAll: function(req: Request) {
      return db.query(req.log, getAllQueryName, getAllQuery, { user_id: req.user.id });
    },
  };

}

export function makeAllData<T>(clazz : GraphQLObjectType, tableName: string, readonlyFields? : string[]) {
  return {
    accessors: makeAccessors(clazz, tableName, readonlyFields),
  };
}

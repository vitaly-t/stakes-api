import * as db from '../services/db';
import * as _ from 'lodash';
import { Request } from '../types';
import 'reflect-metadata';

const COLUMNS = Symbol();

export interface ColumnDecoratorOptions {
  required?: boolean;
  readonly?: boolean;
}

export interface ColumnMetadata extends ColumnDecoratorOptions {
  name: string;
  type: string;
}

// A decorator to indicate that this is a public field.
export function Column(opts?: ColumnDecoratorOptions) : any {
  return function(target, key: string, descriptor: PropertyDescriptor) {
    let columns = Reflect.getMetadata(COLUMNS, target) || [];
    columns.push({
      name: key,
      type: Reflect.getMetadata('design:type', target, key).name,
      ...opts,
    });
    Reflect.defineMetadata(COLUMNS, columns, target);
  }
}

export interface CreateJsonSchemaOptions {
  omitReadonly? : boolean;
  omitColumns? : string[];
}

// Create a JSON schema from an annotated class.
// This doesn't yet support nested schemas.
export function createJsonSchema(clazz, options? : CreateJsonSchemaOptions) {
  let schema = {
    type: 'object',
    properties: {},
    required: [],
  };

  let columns = Reflect.getMetadata(COLUMNS, clazz.prototype) as ColumnMetadata[];
  if(!columns) {
    throw new Error(`No schema for class ${clazz}`);
  }

  let omitColumns = new Set(_.get(options, 'omitColumns', []));
  let omitReadonly = _.get(options, 'omitReadonly', false);

  _.each(columns, (column) => {
    if(omitColumns.has(column.name) || (omitReadonly && column.readonly)) {
      return;
    }

    schema.properties[column.name] = { type: column.type };
    if(column.required) {
      schema.required.push(column.name);
    }
  });

  return schema;
}


export function createColumnSet(clazz, tableName: string) {
  let columns = Reflect.getMetadata(COLUMNS, clazz.prototype);
  if(!columns) {
    throw new Error(`Expected columns but found none for ${clazz}`);
  }
  return new db.helpers.ColumnSet(_.map(columns, 'name'), { table: tableName });
}

export function makeAccessors<T>(clazz : T, tableName: string) {
  type PartialT = {
    [K in keyof T]?: T[K];
  }

  const columnSet = createColumnSet(clazz, tableName);

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
    add: function(req: Request, data: PartialT) {
      let q = db.helpers.insert(data, columnSet) + ' RETURNING *';
      return db.query(req.log, addQueryName, q);
    },

    update: function(req: Request, id: string, data: PartialT) {
      let q = db.helpers.update(data, columnSet);
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

export function makeAllData<T>(clazz : T, tableName: string) {
  return {
    accessors: makeAccessors(clazz, tableName),
    schema: {
      input: createJsonSchema(clazz, { omitReadonly: true }),
      output: createJsonSchema(clazz),
    },
  };
}
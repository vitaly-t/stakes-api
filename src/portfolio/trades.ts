import * as models from '../common/models';
import * as _ from 'lodash';
import * as optionlegs from './optionlegs';
import { Request } from '../types';

const Column = models.Column;

export class Trade {
  @Column({ readonly: true })
  id : string;

  @Column({ readonly: true })
  user_id : string;

  @Column({ required : true })
  position : string;

  @Column()
  broker_id : number;

  @Column()
  name : string;

  @Column()
  note : string;

  @Column({ required: true})
  symbol : string;

  @Column({ required: true })
  size : number;

  @Column({ required: true })
  price : number;

  @Column()
  multiplier : number;

  @Column()
  commissions : number;

  @Column()
  notional_risk : number;

  @Column({ readonly: true })
  combined_into : string;

  @Column()
  traded : Date;

  @Column({ readonly : true })
  added : Date;
}

const { accessors: preMadeAccessors, schema } = models.makeAllData(Trade, 'trades');

export { schema };

export interface GetOptions {
  id ? : string | string[];
  symbol? : string;
  includeLegs? : boolean;
  includeCombined? : boolean;
}

export const accessors = {
  get: (req : Request, options : GetOptions = {}) => {
    let wheres = ['user_id=$[user_id]'];
    let args : any = {
      user_id: req.user.id,
    };

    if(options.id) {
      args.id = options.id;
      if(_.isArray(options.id)) {
        wheres.push('id = ANY($[id]');
      } else {
        wheres.push('id=$[id]');
      }
    }

    if(options.symbol) {
      args.symbol = options.symbol;
      wheres.push('symbol = $[symbol]');
    }

    if(options.includeCombined !== true) {
      wheres.push('combined_trade IS NULL');
    }

    let nonIdFields = [
      'position', 'broker_id', 'name', 'note', 'symbol', 'size', 'price', 'multiplier', 'commissions', 'notional_risk', 'combined_into', 'traded', 'added',
    ];

    let fields;
    let joinClause;
    if(options.includeLegs) {
      joinClause = `LEFT JOIN optionlegs ol ON ol.opening_trade=t.id
        GROUP BY t.id`;
      fields = _.map(nonIdFields, (field) => `MAX(t.${field}) ${field}`);
      fields.push(`json_agg(json_build_object(${optionlegs.jsonObjectSyntax})) legs`)
    } else {
      fields = _.map(nonIdFields, (field) => `t.${field}`)
    }

    let select = ['t.id'];
    select.push(...fields);

    let query = `SELECT ${select.join(', ')}
      FROM trades t
      ${joinClause}
      ${wheres.join(' AND ')}`;

  },
  ...preMadeAccessors,
}
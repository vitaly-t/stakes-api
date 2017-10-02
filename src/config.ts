import * as _ from 'lodash';

export const db = {
  url: process.env.DB_URL || 'sqlite3://stakes.db',
};

export const env = _.toLower(process.env.ENV || process.env.NODE_ENV || 'dev');
export const dev = env === 'dev' || env === 'development';


const bindList = (process.env.BIND_HOST || '127.0.0.1:7834').split(':');
let host;
let port;
if(bindList.length > 1) {
  [host, port] = bindList;
} else {
  host = '127.0.0.1';
  port = bindList[0];
}

export const bind = {
  port: +port,
  host: host,
};